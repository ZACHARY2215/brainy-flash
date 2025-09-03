import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database.js';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Generate a shareable link for a set
router.post('/:setId/share', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const { expires_at } = req.body;
    const db = getDB();
    
    // Check if user owns the set or has edit access
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('editor', 'owner'))`,
      [req.user.id, setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Generate unique share token
    const shareToken = require('crypto').randomBytes(16).toString('hex');
    
    // Create shared link
    const [result] = await db.execute(
      `INSERT INTO shared_links (id, set_id, user_id, share_token, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), setId, req.user.id, shareToken, expires_at || null]
    );
    
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${shareToken}`;
    
    res.json({ 
      share_url: shareUrl,
      share_token: shareToken,
      expires_at: expires_at || null
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get shared link details
router.get('/:setId/share', authenticateUser, async (req, res) => {  try {
    const { setId } = req.params;
    const db = getDB();
    
    // Check if user owns the set
    const [sets] = await db.execute(
      'SELECT id FROM sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get shared links for this set
    const [sharedLinks] = await db.execute(
      'SELECT * FROM shared_links WHERE set_id = ? ORDER BY created_at DESC',
      [setId]
    );
    
    res.json(sharedLinks);
  } catch (error) {
    console.error('Get share links error:', error);
    res.status(500).json({ error: 'Failed to get share links' });
  }
});

// Revoke a shared link
router.delete('/:setId/share/:linkId', authenticateUser, async (req, res) => {  try {
    const { setId, linkId } = req.params;
    const db = getDB();
    
    // Check if user owns the set
    const [sets] = await db.execute(
      'SELECT id FROM sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete the shared link
    await db.execute(
      'DELETE FROM shared_links WHERE id = ? AND set_id = ?',
      [linkId, setId]
    );
    
    res.json({ message: 'Share link revoked successfully' });
  } catch (error) {
    console.error('Revoke share link error:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

// Access a shared set via token
router.get('/shared/:token', optionalAuth, async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDB();
    
    // Get shared link details
    const [sharedLinks] = await db.execute(
      `SELECT sl.*, s.*, u.username as creator_username, u.full_name as creator_name
       FROM shared_links sl
       JOIN sets s ON sl.set_id = s.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE sl.share_token = ? AND sl.is_active = true
       AND (sl.expires_at IS NULL OR sl.expires_at > NOW())`,
      [token]
    );
    
    if (sharedLinks.length === 0) {
      return res.status(404).json({ error: 'Share link not found or expired' });
    }
    
    const sharedLink = sharedLinks[0];
    
    // Get flashcards for this set
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY created_at ASC',
      [sharedLink.set_id]
    );
    
    // Check if user is authenticated and has access to this set
    let userAccess = 'public';
    if (req.user) {
      if (req.user.id === sharedLink.user_id) {
        userAccess = 'owner';
      } else {
        // Check if user is a collaborator
        const [collaborators] = await db.execute(
          'SELECT permission FROM collaborators WHERE set_id = ? AND user_id = ?',
          [sharedLink.set_id, req.user.id]
        );
        if (collaborators.length > 0) {
          userAccess = collaborators[0].permission;
        }
      }
    }
    
    const setData = {
      ...sharedLink,
      flashcards,
      user_access: userAccess,
      is_shared: true
    };
    
    res.json(setData);
  } catch (error) {
    console.error('Access shared set error:', error);
    res.status(500).json({ error: 'Failed to access shared set' });
  }
});

// Add collaborator to a set
router.post('/:setId/collaborators', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const { user_email, permission = 'viewer' } = req.body;
    
    if (!user_email || !['viewer', 'editor', 'owner'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid email or permission level' });
    }
    
    const db = getDB();
    
    // Check if user owns the set
    const [sets] = await db.execute(
      'SELECT id FROM sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find user by email
    const [users] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [user_email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const collaboratorUserId = users[0].id;
    
    // Check if already a collaborator
    const [existing] = await db.execute(
      'SELECT id FROM collaborators WHERE set_id = ? AND user_id = ?',
      [setId, collaboratorUserId]
    );
    
    if (existing.length > 0) {
      // Update existing permission
      await db.execute(
        'UPDATE collaborators SET permission = ? WHERE set_id = ? AND user_id = ?',
        [permission, setId, collaboratorUserId]
      );
    } else {
      // Add new collaborator
      await db.execute(
        'INSERT INTO collaborators (id, set_id, user_id, permission) VALUES (?, ?, ?, ?)',
        [uuidv4(), setId, collaboratorUserId, permission]
      );
    }
    
    res.json({ message: 'Collaborator added successfully' });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

// Get collaborators for a set
router.get('/:setId/collaborators', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDB();
    
    // Check if user owns the set or is a collaborator
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.id IS NOT NULL)`,
      [req.user.id, setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get collaborators
    const [collaborators] = await db.execute(
      `SELECT c.*, u.username, u.full_name, u.email
       FROM collaborators c
       JOIN users u ON c.user_id = u.id
       WHERE c.set_id = ?
       ORDER BY c.created_at ASC`,
      [setId]
    );
    
    res.json(collaborators);
  } catch (error) {
    console.error('Get collaborators error:', error);
    res.status(500).json({ error: 'Failed to get collaborators' });
  }
});

// Remove collaborator from a set
router.delete('/:setId/collaborators/:collaboratorId', authenticateUser, async (req, res) => {
  try {
    const { setId, collaboratorId } = req.params;
    const db = getDB();
    
    // Check if user owns the set
    const [sets] = await db.execute(
      'SELECT id FROM sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Remove collaborator
    await db.execute(
      'DELETE FROM collaborators WHERE id = ? AND set_id = ?',
      [collaboratorId, setId]
    );
    
    res.json({ message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Update collaborator permission
router.put('/:setId/collaborators/:collaboratorId', authenticateUser, async (req, res) => {
  try {
    const { setId, collaboratorId } = req.params;
    const { permission } = req.body;
    
    if (!['viewer', 'editor', 'owner'].includes(permission)) {
      return res.status(400).json({ error: 'Invalid permission level' });
    }
    
    const db = getDB();
    
    // Check if user owns the set
    const [sets] = await db.execute(
      'SELECT id FROM sets WHERE id = ? AND user_id = ?',
      [setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update permission
    await db.execute(
      'UPDATE collaborators SET permission = ? WHERE id = ? AND set_id = ?',
      [permission, collaboratorId, setId]
    );
    
    res.json({ message: 'Permission updated successfully' });
  } catch (error) {
    console.error('Update collaborator permission error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

export default router;
