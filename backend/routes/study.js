import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../config/database.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Start a study session
router.post('/session/start', authenticateUser, async (req, res) => {
  try {
    const { set_id, mode } = req.body;
    
    if (!set_id || !mode) {
      return res.status(400).json({ error: 'Set ID and mode are required' });
    }
    
    const validModes = ['flashcard', 'multiple_choice', 'written'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: 'Invalid study mode' });
    }
    
    const db = getDB();
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       WHERE s.id = ? AND (s.user_id = ? OR s.is_public = TRUE OR 
             EXISTS (SELECT 1 FROM collaborators c WHERE c.set_id = s.id AND c.user_id = ?))`,
      [set_id, req.user.id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const sessionId = uuidv4();
    
    await db.execute(
      `INSERT INTO study_sessions (id, user_id, set_id, mode, started_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [sessionId, req.user.id, set_id, mode]
    );
    
    res.json({ session_id: sessionId });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start study session' });
  }
});

// End a study session
router.put('/session/:sessionId/end', authenticateUser, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { cards_studied, correct_answers, total_time_seconds } = req.body;
    
    const db = getDB();
    
    // Update session
    await db.execute(
      `UPDATE study_sessions 
       SET completed_at = NOW(), 
           cards_studied = ?, 
           correct_answers = ?, 
           total_time_seconds = ?
       WHERE id = ? AND user_id = ?`,
      [cards_studied || 0, correct_answers || 0, total_time_seconds || 0, sessionId, req.user.id]
    );
    
    res.json({ message: 'Session completed' });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end study session' });
  }
});

// Record flashcard progress
router.post('/progress', authenticateUser, async (req, res) => {
  try {
    const { flashcard_id, is_correct, difficulty_rating } = req.body;
    
    if (!flashcard_id || is_correct === undefined) {
      return res.status(400).json({ error: 'Flashcard ID and correctness are required' });
    }
    
    const db = getDB();
    
    // Check if progress record exists
    const [existing] = await db.execute(
      'SELECT * FROM study_progress WHERE user_id = ? AND flashcard_id = ?',
      [req.user.id, flashcard_id]
    );
    
    if (existing.length > 0) {
      // Update existing progress
      const progress = existing[0];
      const newCorrectCount = progress.correct_count + (is_correct ? 1 : 0);
      const newIncorrectCount = progress.incorrect_count + (is_correct ? 0 : 1);
      
      await db.execute(
        `UPDATE study_progress 
         SET correct_count = ?, 
             incorrect_count = ?, 
             last_studied = NOW(),
             difficulty_rating = ?
         WHERE user_id = ? AND flashcard_id = ?`,
        [newCorrectCount, newIncorrectCount, difficulty_rating || progress.difficulty_rating, req.user.id, flashcard_id]
      );
    } else {
      // Create new progress record
      await db.execute(
        `INSERT INTO study_progress (id, user_id, flashcard_id, correct_count, incorrect_count, difficulty_rating)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          req.user.id,
          flashcard_id,
          is_correct ? 1 : 0,
          is_correct ? 0 : 1,
          difficulty_rating || 'medium'
        ]
      );
    }
    
    res.json({ message: 'Progress recorded' });
  } catch (error) {
    console.error('Record progress error:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

// Get study statistics
router.get('/stats/:setId', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDB();
    
    // Get overall session stats
    const [sessions] = await db.execute(
      `SELECT 
         COUNT(*) as total_sessions,
         SUM(cards_studied) as total_cards_studied,
         SUM(correct_answers) as total_correct,
         SUM(total_time_seconds) as total_time,
         AVG(correct_answers * 100.0 / cards_studied) as avg_accuracy
       FROM study_sessions 
       WHERE user_id = ? AND set_id = ?`,
      [req.user.id, setId]
    );
    
    // Get individual card progress
    const [cardProgress] = await db.execute(
      `SELECT 
         f.id,
         f.term,
         f.description,
         sp.correct_count,
         sp.incorrect_count,
         sp.difficulty_rating,
         sp.last_studied
       FROM flashcards f
       LEFT JOIN study_progress sp ON f.id = sp.flashcard_id AND sp.user_id = ?
       WHERE f.set_id = ?
       ORDER BY sp.last_studied DESC NULLS LAST`,
      [req.user.id, setId]
    );
    
    // Get recent sessions
    const [recentSessions] = await db.execute(
      `SELECT 
         mode,
         cards_studied,
         correct_answers,
         total_time_seconds,
         started_at,
         completed_at
       FROM study_sessions 
       WHERE user_id = ? AND set_id = ?
       ORDER BY started_at DESC
       LIMIT 10`,
      [req.user.id, setId]
    );
    
    const stats = {
      total_sessions: sessions[0].total_sessions || 0,
      total_cards_studied: sessions[0].total_cards_studied || 0,
      total_correct: sessions[0].total_correct || 0,
      total_time_minutes: Math.round((sessions[0].total_time || 0) / 60),
      avg_accuracy: Math.round(sessions[0].avg_accuracy || 0),
      card_progress: cardProgress,
      recent_sessions: recentSessions
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get study statistics' });
  }
});

// Get recommended cards for study
router.get('/recommended/:setId', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDB();
    
    // Get cards that need practice (never studied or low accuracy)
    const [recommendedCards] = await db.execute(
      `SELECT 
         f.id,
         f.term,
         f.description,
         sp.correct_count,
         sp.incorrect_count,
         sp.difficulty_rating,
         sp.last_studied
       FROM flashcards f
       LEFT JOIN study_progress sp ON f.id = sp.flashcard_id AND sp.user_id = ?
       WHERE f.set_id = ?
       AND (
         sp.id IS NULL OR 
         sp.correct_count + sp.incorrect_count < 3 OR
         (sp.correct_count * 100.0 / (sp.correct_count + sp.incorrect_count)) < 70 OR
         sp.difficulty_rating = 'hard'
       )
       ORDER BY sp.last_studied ASC NULLS FIRST
       LIMIT 10`,
      [req.user.id, setId]
    );
    
    res.json(recommendedCards);
  } catch (error) {
    console.error('Get recommended cards error:', error);
    res.status(500).json({ error: 'Failed to get recommended cards' });
  }
});

export default router;
