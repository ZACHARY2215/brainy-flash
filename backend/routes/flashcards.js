import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database.js';
import { authenticateUser, requireOwnership, requireCollaboration } from '../middleware/auth.js';

const router = express.Router();

// Get flashcards for a set
router.get('/set/:setId', async (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDB();
    
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY created_at ASC',
      [setId]
    );
    
    res.json(flashcards);
  } catch (error) {
    console.error('Get flashcards error:', error);
    res.status(500).json({ error: 'Failed to get flashcards' });
  }
});

// Create new flashcard
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { set_id, term, description, image_url } = req.body;
    
    if (!set_id || !term || !description) {
      return res.status(400).json({ error: 'Set ID, term, and description are required' });
    }
    
    const db = getDB();
    
    // Check if user owns the set or has write access
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('write', 'admin'))`,
      [req.user.id, set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const flashcardId = uuidv4();
    
    await db.execute(
      'INSERT INTO flashcards (id, set_id, term, description, image_url) VALUES (?, ?, ?, ?, ?)',
      [flashcardId, set_id, term.trim(), description.trim(), image_url || null]
    );
    
    // Get created flashcard
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE id = ?',
      [flashcardId]
    );
    
    res.status(201).json(flashcards[0]);
  } catch (error) {
    console.error('Create flashcard error:', error);
    res.status(500).json({ error: 'Failed to create flashcard' });
  }
});

// Update flashcard
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { term, description, image_url } = req.body;
    
    const db = getDB();
    
    // Check if user has access to modify this flashcard
    const [flashcards] = await db.execute(
      `SELECT f.* FROM flashcards f
       JOIN sets s ON f.set_id = s.id
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE f.id = ? AND (s.user_id = ? OR c.permission IN ('write', 'admin'))`,
      [req.user.id, id, req.user.id]
    );
    
    if (flashcards.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updateFields = [];
    const updateValues = [];
    
    if (term !== undefined) {
      updateFields.push('term = ?');
      updateValues.push(term.trim());
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description.trim());
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateValues.push(image_url);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.execute(
      `UPDATE flashcards SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Get updated flashcard
    const [updatedFlashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE id = ?',
      [id]
    );
    
    res.json(updatedFlashcards[0]);
  } catch (error) {
    console.error('Update flashcard error:', error);
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
});

// Delete flashcard
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    // Check if user has access to delete this flashcard
    const [flashcards] = await db.execute(
      `SELECT f.* FROM flashcards f
       JOIN sets s ON f.set_id = s.id
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE f.id = ? AND (s.user_id = ? OR c.permission = 'admin')`,
      [req.user.id, id, req.user.id]
    );
    
    if (flashcards.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.execute('DELETE FROM flashcards WHERE id = ?', [id]);
    
    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error) {
    console.error('Delete flashcard error:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

// Bulk create flashcards
router.post('/bulk', authenticateUser, async (req, res) => {
  try {
    const { set_id, flashcards } = req.body;
    
    if (!set_id || !flashcards || !Array.isArray(flashcards)) {
      return res.status(400).json({ error: 'Set ID and flashcards array are required' });
    }
    
    const db = getDB();
    
    // Check if user owns the set or has write access
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('write', 'admin'))`,
      [req.user.id, set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const createdFlashcards = [];
    
    for (const card of flashcards) {
      if (!card.term || !card.description) {
        continue; // Skip invalid cards
      }
      
      const flashcardId = uuidv4();
      
      await db.execute(
        'INSERT INTO flashcards (id, set_id, term, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [flashcardId, set_id, card.term.trim(), card.description.trim(), card.image_url || null]
      );
      
      createdFlashcards.push({
        id: flashcardId,
        set_id,
        term: card.term.trim(),
        description: card.description.trim(),
        image_url: card.image_url || null
      });
    }
    
    res.status(201).json(createdFlashcards);
  } catch (error) {
    console.error('Bulk create flashcards error:', error);
    res.status(500).json({ error: 'Failed to create flashcards' });
  }
});

export default router;
