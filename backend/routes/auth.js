import express from 'express';
import { supabase } from '../config/supabase.js';
import { getDB } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const db = getDB();
    const [user] = await db.execute(
      'SELECT id, email, username, full_name, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { username, full_name, avatar_url } = req.body;
    
    // Validate username uniqueness if provided
    if (username) {
      const db = getDB();
      const [existingUser] = await db.execute(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, req.user.id]
      );
      
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }
    
    // Update user profile
    const db = getDB();
    const updateFields = [];
    const updateValues = [];
    
    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }
    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      updateValues.push(full_name);
    }
    if (avatar_url !== undefined) {
      updateFields.push('avatar_url = ?');
      updateValues.push(avatar_url);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(req.user.id);
    
    await db.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    // Get updated user
    const [updatedUser] = await db.execute(
      'SELECT id, email, username, full_name, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const db = getDB();
    
    // Get total sets created
    const [setsResult] = await db.execute(
      'SELECT COUNT(*) as total_sets FROM sets WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get total flashcards created
    const [flashcardsResult] = await db.execute(
      `SELECT COUNT(*) as total_flashcards 
       FROM flashcards f 
       JOIN sets s ON f.set_id = s.id 
       WHERE s.user_id = ?`,
      [req.user.id]
    );
    
    // Get total study sessions
    const [sessionsResult] = await db.execute(
      'SELECT COUNT(*) as total_sessions FROM study_sessions WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get total study time
    const [timeResult] = await db.execute(
      'SELECT SUM(total_time_seconds) as total_time FROM study_sessions WHERE user_id = ?',
      [req.user.id]
    );
    
    // Get accuracy
    const [accuracyResult] = await db.execute(
      `SELECT 
         SUM(correct_answers) as total_correct,
         SUM(cards_studied) as total_studied
       FROM study_sessions 
       WHERE user_id = ?`,
      [req.user.id]
    );
    
    const stats = {
      total_sets: setsResult[0].total_sets,
      total_flashcards: flashcardsResult[0].total_flashcards,
      total_sessions: sessionsResult[0].total_sessions,
      total_time_minutes: Math.round((timeResult[0].total_time || 0) / 60),
      accuracy_percentage: accuracyResult[0].total_studied > 0 
        ? Math.round((accuracyResult[0].total_correct / accuracyResult[0].total_studied) * 100)
        : 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete user account
router.delete('/account', authenticateUser, async (req, res) => {
  try {
    const db = getDB();
    
    // Delete user from our database (cascade will handle related data)
    await db.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    
    // Note: User will need to delete their Supabase account separately
    // as we don't have admin privileges to delete Supabase users
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
