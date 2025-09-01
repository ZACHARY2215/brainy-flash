import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database.js';
import { authenticateUser, optionalAuth, requireOwnership, requireCollaboration } from '../middleware/auth.js';

const router = express.Router();

// Get all sets (with optional search and filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, tags, public_only, user_id, limit = 20, offset = 0 } = req.query;
    const db = getDB();
    
    let query = `
      SELECT 
        s.*,
        u.username as creator_username,
        u.full_name as creator_name,
        COUNT(f.id) as flashcard_count,
        COUNT(DISTINCT ss.id) as study_sessions_count,
        CASE WHEN fav.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
      FROM sets s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN flashcards f ON s.id = f.set_id
      LEFT JOIN study_sessions ss ON s.id = ss.set_id
      LEFT JOIN favorites fav ON s.id = fav.set_id AND fav.user_id = ?
    `;
    
    const queryParams = [req.user?.id || null];
    const whereConditions = [];
    
    // Search filter
    if (search) {
      whereConditions.push('(s.title LIKE ? OR s.description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    // Tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      whereConditions.push('JSON_OVERLAPS(s.tags, ?)');
      queryParams.push(JSON.stringify(tagArray));
    }
    
    // Public only filter
    if (public_only === 'true') {
      whereConditions.push('s.is_public = TRUE');
    }
    
    // User filter
    if (user_id) {
      whereConditions.push('s.user_id = ?');
      queryParams.push(user_id);
    } else if (!req.user) {
      // If no user is authenticated, only show public sets
      whereConditions.push('s.is_public = TRUE');
    } else {
      // Show user's own sets, public sets, and sets they have access to
      whereConditions.push(`
        (s.user_id = ? OR s.is_public = TRUE OR 
         EXISTS (SELECT 1 FROM collaborators c WHERE c.set_id = s.id AND c.user_id = ?))
      `);
      queryParams.push(req.user.id, req.user.id);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += `
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const [sets] = await db.execute(query, queryParams);
    
    res.json(sets);
  } catch (error) {
    console.error('Get sets error:', error);
    res.status(500).json({ error: 'Failed to get sets' });
  }
});

// Get single set by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Check if user has access to this set
    let accessQuery = `
      SELECT 
        s.*,
        u.username as creator_username,
        u.full_name as creator_name,
        COUNT(f.id) as flashcard_count,
        CASE WHEN fav.id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
      FROM sets s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN flashcards f ON s.id = f.set_id
      LEFT JOIN favorites fav ON s.id = fav.set_id AND fav.user_id = ?
      WHERE s.id = ?
    `;
    
    const accessParams = [req.user?.id || null, id];
    
    if (!req.user) {
      accessQuery += ' AND s.is_public = TRUE';
    } else {
      accessQuery += `
        AND (s.user_id = ? OR s.is_public = TRUE OR 
             EXISTS (SELECT 1 FROM collaborators c WHERE c.set_id = s.id AND c.user_id = ?))
      `;
      accessParams.push(req.user.id, req.user.id);
    }
    
    accessQuery += ' GROUP BY s.id';
    
    const [sets] = await db.execute(accessQuery, accessParams);
    
    if (sets.length === 0) {
      return res.status(404).json({ error: 'Set not found or access denied' });
    }
    
    // Get flashcards for this set
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY created_at ASC',
      [id]
    );
    
    // Get collaborators if user is owner
    let collaborators = [];
    if (req.user && sets[0].user_id === req.user.id) {
      const [collabResult] = await db.execute(
        `SELECT c.*, u.username, u.full_name, u.email
         FROM collaborators c
         JOIN users u ON c.user_id = u.id
         WHERE c.set_id = ?`,
        [id]
      );
      collaborators = collabResult;
    }
    
    const set = {
      ...sets[0],
      flashcards,
      collaborators
    };
    
    res.json(set);
  } catch (error) {
    console.error('Get set error:', error);
    res.status(500).json({ error: 'Failed to get set' });
  }
});

// Create new set
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, description, tags, is_public, is_collaborative } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const db = getDB();
    const setId = uuidv4();
    
    await db.execute(
      `INSERT INTO sets (id, user_id, title, description, tags, is_public, is_collaborative)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        setId,
        req.user.id,
        title.trim(),
        description?.trim() || null,
        tags ? JSON.stringify(tags) : null,
        is_public || false,
        is_collaborative || false
      ]
    );
    
    // Get created set
    const [sets] = await db.execute(
      `SELECT s.*, u.username as creator_username, u.full_name as creator_name
       FROM sets s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [setId]
    );
    
    res.status(201).json(sets[0]);
  } catch (error) {
    console.error('Create set error:', error);
    res.status(500).json({ error: 'Failed to create set' });
  }
});

// Update set
router.put('/:id', authenticateUser, requireOwnership('set'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, is_public, is_collaborative } = req.body;
    
    const db = getDB();
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title.trim());
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description?.trim() || null);
    }
    if (tags !== undefined) {
      updateFields.push('tags = ?');
      updateValues.push(tags ? JSON.stringify(tags) : null);
    }
    if (is_public !== undefined) {
      updateFields.push('is_public = ?');
      updateValues.push(is_public);
    }
    if (is_collaborative !== undefined) {
      updateFields.push('is_collaborative = ?');
      updateValues.push(is_collaborative);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.execute(
      `UPDATE sets SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Get updated set
    const [sets] = await db.execute(
      `SELECT s.*, u.username as creator_username, u.full_name as creator_name
       FROM sets s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [id]
    );
    
    res.json(sets[0]);
  } catch (error) {
    console.error('Update set error:', error);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// Delete set
router.delete('/:id', authenticateUser, requireOwnership('set'), async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    await db.execute('DELETE FROM sets WHERE id = ?', [id]);
    
    res.json({ message: 'Set deleted successfully' });
  } catch (error) {
    console.error('Delete set error:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

// Toggle favorite
router.post('/:id/favorite', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Check if set exists and user has access
    const [sets] = await db.execute(
      `SELECT id FROM sets WHERE id = ? AND 
       (user_id = ? OR is_public = TRUE OR 
        EXISTS (SELECT 1 FROM collaborators c WHERE c.set_id = sets.id AND c.user_id = ?))`,
      [id, req.user.id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(404).json({ error: 'Set not found or access denied' });
    }
    
    // Check if already favorited
    const [existing] = await db.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND set_id = ?',
      [req.user.id, id]
    );
    
    if (existing.length > 0) {
      // Remove from favorites
      await db.execute(
        'DELETE FROM favorites WHERE user_id = ? AND set_id = ?',
        [req.user.id, id]
      );
      res.json({ favorited: false });
    } else {
      // Add to favorites
      await db.execute(
        'INSERT INTO favorites (id, user_id, set_id) VALUES (?, ?, ?)',
        [uuidv4(), req.user.id, id]
      );
      res.json({ favorited: true });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

// Get user's favorites
router.get('/user/favorites', authenticateUser, async (req, res) => {
  try {
    const db = getDB();
    
    const [favorites] = await db.execute(
      `SELECT 
         s.*,
         u.username as creator_username,
         u.full_name as creator_name,
         COUNT(f.id) as flashcard_count,
         fav.created_at as favorited_at
       FROM favorites fav
       JOIN sets s ON fav.set_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN flashcards f ON s.id = f.set_id
       WHERE fav.user_id = ?
       GROUP BY s.id
       ORDER BY fav.created_at DESC`,
      [req.user.id]
    );
    
    res.json(favorites);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

export default router;
