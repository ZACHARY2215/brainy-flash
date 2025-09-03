import express from 'express';
import OpenAI from 'openai';
import { authenticateUser } from '../middleware/auth.js';
import { getDB } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Generate flashcards from text
router.post('/generate', authenticateUser, async (req, res) => {
  try {
    const { text, set_id, delimiter = ':', count = 10 } = req.body;
    
    if (!text || !set_id) {
      return res.status(400).json({ error: 'Text and set_id are required' });
    }
    
    const db = getDB();
    
    // Check if user owns the set or has write access
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('editor', 'owner'))`,
      [req.user.id, set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    let flashcards = [];
    
    // If delimiter is provided, try to parse existing flashcards
    if (delimiter && text.includes(delimiter)) {
      const lines = text.split('\n').filter(line => line.trim());
      flashcards = lines
        .map(line => {
          const parts = line.split(delimiter);
          if (parts.length >= 2) {
            return {
              term: parts[0].trim(),
              description: parts.slice(1).join(delimiter).trim()
            };
          }
          return null;
        })
        .filter(card => card && card.term && card.description)
        .slice(0, count);
    }
    
    // If no flashcards found or not enough, use AI to generate
    if (flashcards.length === 0 || flashcards.length < count) {
      const remainingCount = count - flashcards.length;
      
      if (openai) {
        // Use OpenAI if available
        const prompt = `Generate ${remainingCount} educational flashcards from the following text. 
        Each flashcard should have a clear term/concept and a concise description/definition.
        Format each flashcard as: "Term: Description"
        
        Text: ${text}
        
        Generate ${remainingCount} flashcards:`;
        
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an educational assistant that creates clear, concise flashcards. Each flashcard should have a term or concept on one side and a clear, educational description on the other."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });
        
        const aiResponse = completion.choices[0].message.content;
        const aiLines = aiResponse.split('\n').filter(line => line.trim());
        
        const aiFlashcards = aiLines
          .map(line => {
            if (line.includes(':')) {
              const parts = line.split(':');
              if (parts.length >= 2) {
                return {
                  term: parts[0].trim(),
                  description: parts.slice(1).join(':').trim()
                };
              }
            }
            return null;
          })
          .filter(card => card && card.term && card.description);
        
        flashcards = [...flashcards, ...aiFlashcards];
      } else {
        // Fallback: create simple flashcards from text
        const words = text.split(/\s+/).filter(word => word.length > 3);
        const fallbackCards = [];
        
        for (let i = 0; i < Math.min(remainingCount, words.length); i++) {
          fallbackCards.push({
            term: words[i],
            description: `Definition for ${words[i]}`
          });
        }
        
        flashcards = [...flashcards, ...fallbackCards];
      }
    }
    
    // Limit to requested count
    flashcards = flashcards.slice(0, count);
    
    // Insert flashcards into database
    const insertedFlashcards = [];
    for (const card of flashcards) {
      const [result] = await db.execute(
        'INSERT INTO flashcards (id, set_id, term, description) VALUES (?, ?, ?, ?)',
        [uuidv4(), set_id, card.term, card.description]
      );
      
      insertedFlashcards.push({
        id: result.insertId,
        ...card
      });
    }
    
    res.json({
      flashcards: insertedFlashcards,
      count: insertedFlashcards.length
    });
  } catch (error) {
    console.error('Generate flashcards error:', error);
    res.status(500).json({ error: 'Failed to generate flashcards' });
  }
});

// Generate multiple choice questions
router.post('/multiple-choice', authenticateUser, async (req, res) => {
  try {
    const { flashcard_id, count = 3 } = req.body;
    
    if (!flashcard_id) {
      return res.status(400).json({ error: 'Flashcard ID is required' });
    }
    
    const db = getDB();
    
    // Get the flashcard
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE id = ?',
      [flashcard_id]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    
    const flashcard = flashcards[0];
    
    // Get other flashcards from the same set for distractors
    const [otherFlashcards] = await db.execute(
      'SELECT description FROM flashcards WHERE set_id = ? AND id != ? LIMIT 10',
      [flashcard.set_id, flashcard_id]
    );
    
    const distractors = otherFlashcards.map(f => f.description);
    
    // Generate additional distractors using AI if needed
    if (distractors.length < count && openai) {
      const prompt = `Generate ${count - distractors.length} plausible but incorrect answers for this question:
      
      Question: ${flashcard.term}
      Correct Answer: ${flashcard.description}
      
      Generate ${count - distractors.length} incorrect but plausible answers:`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an educational assistant that generates plausible but incorrect answers for multiple choice questions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8,
      });
      
      const aiResponse = completion.choices[0].message.content;
      const aiDistractors = aiResponse.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
      
      distractors.push(...aiDistractors);
    }
    
    // Shuffle and select distractors
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5);
    const selectedDistractors = shuffledDistractors.slice(0, count);
    
    // Create options array with correct answer and distractors
    const options = [
      { text: flashcard.description, correct: true },
      ...selectedDistractors.map(text => ({ text, correct: false }))
    ];
    
    // Shuffle options
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    
    res.json({
      question: flashcard.term,
      options: shuffledOptions,
      correct_answer: flashcard.description
    });
    
  } catch (error) {
    console.error('Multiple choice generation error:', error);
    res.status(500).json({ error: 'Failed to generate multiple choice questions' });
  }
});

// Generate identification test
router.post('/identification', authenticateUser, async (req, res) => {
  try {
    const { set_id, count = 10 } = req.body;
    
    if (!set_id) {
      return res.status(400).json({ error: 'Set ID is required' });
    }
    
    const db = getDB();
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('viewer', 'editor', 'owner'))`,
      [req.user.id, set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get flashcards from the set
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?',
      [set_id, count]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'No flashcards found in this set' });
    }
    
    // Generate identification questions
    const questions = flashcards.map((card, index) => ({
      id: index + 1,
      question: card.term,
      answer: card.description,
      type: 'identification'
    }));
    
    res.json({
      test_type: 'identification',
      questions: questions,
      total_questions: questions.length
    });
    
  } catch (error) {
    console.error('Identification test generation error:', error);
    res.status(500).json({ error: 'Failed to generate identification test' });
  }
});

// Generate matching type test
router.post('/matching', authenticateUser, async (req, res) => {
  try {
    const { set_id, count = 10 } = req.body;
    
    if (!set_id) {
      return res.status(400).json({ error: 'Set ID is required' });
    }
    
    const db = getDB();
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('viewer', 'editor', 'owner'))`,
      [req.user.id, set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get flashcards from the set
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY RANDOM() LIMIT ?',
      [set_id, count]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'No flashcards found in this set' });
    }
    
    // Create matching pairs
    const terms = flashcards.map(card => card.term);
    const descriptions = flashcards.map(card => card.description);
    
    // Shuffle descriptions
    const shuffledDescriptions = descriptions.sort(() => Math.random() - 0.5);
    
    const questions = terms.map((term, index) => ({
      id: index + 1,
      term: term,
      description: shuffledDescriptions[index],
      correct_match: descriptions[index]
    }));
    
    res.json({
      test_type: 'matching',
      questions: questions,
      total_questions: questions.length
    });
    
  } catch (error) {
    console.error('Matching test generation error:', error);
    res.status(500).json({ error: 'Failed to generate matching test' });
  }
});

// Generate study suggestions
router.post('/suggestions', authenticateUser, async (req, res) => {
  try {
    const { set_id } = req.body;
    
    if (!set_id) {
      return res.status(400).json({ error: 'Set ID is required' });
    }
    
    const db = getDB();
    
    // Get flashcards from the set
    const [flashcards] = await db.execute(
      'SELECT term, description FROM flashcards WHERE set_id = ?',
      [set_id]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'No flashcards found' });
    }
    
    // Get user's study progress
    const [progress] = await db.execute(
      `SELECT sp.flashcard_id, sp.correct_count, sp.incorrect_count, sp.difficulty_rating
       FROM study_progress sp
       JOIN flashcards f ON sp.flashcard_id = f.id
       WHERE f.set_id = ? AND sp.user_id = ?`,
      [set_id, req.user.id]
    );
    
    // Analyze which cards need more practice
    const needsPractice = flashcards.filter(card => {
      const cardProgress = progress.find(p => p.flashcard_id === card.id);
      if (!cardProgress) return true; // Never studied
      
      const totalAttempts = cardProgress.correct_count + cardProgress.incorrect_count;
      const accuracy = totalAttempts > 0 ? cardProgress.correct_count / totalAttempts : 0;
      
      return totalAttempts < 3 || accuracy < 0.7 || cardProgress.difficulty_rating === 'hard';
    });
    
    // Generate study suggestions using AI
    let suggestions = [];
    if (openai) {
      const prompt = `Based on these flashcards, suggest 3 effective study strategies:
      
      Flashcards: ${flashcards.map(f => `${f.term}: ${f.description}`).join('\n')}
      
      Suggest 3 specific study strategies:`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an educational expert that provides practical study advice."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.7,
      });
      
      suggestions = completion.choices[0].message.content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0);
    }
    
    res.json({
      total_cards: flashcards.length,
      needs_practice: needsPractice.length,
      suggestions: suggestions.slice(0, 3),
      recommended_cards: needsPractice.slice(0, 5).map(card => ({
        term: card.term,
        description: card.description
      }))
    });
    
  } catch (error) {
    console.error('Study suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate study suggestions' });
  }
});

// Generate AI review notes for a flashcard
router.post('/review-notes/:flashcardId', authenticateUser, async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { include_examples = true, include_mnemonics = true } = req.body;
    
    const db = getDB();
    
    // Get flashcard details
    const [flashcards] = await db.execute(
      `SELECT f.*, s.title as set_title, s.tags as set_tags
       FROM flashcards f
       JOIN sets s ON f.set_id = s.id
       WHERE f.id = ?`,
      [flashcardId]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    
    const flashcard = flashcards[0];
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('viewer', 'editor', 'owner'))`,
      [req.user.id, flashcard.set_id, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!openai) {
      return res.status(503).json({ error: 'AI service not available' });
    }
    
    // Generate comprehensive review notes
    const prompt = `Generate comprehensive review notes for the following flashcard:

Term: ${flashcard.term}
Description: ${flashcard.description}
Set: ${flashcard.set_title}
Tags: ${flashcard.set_tags?.join(', ') || 'None'}

Please provide structured, concise notes that include:
1. Key concepts and definitions
2. Important details to remember
3. ${include_examples ? 'Practical examples or applications' : ''}
4. ${include_mnemonics ? 'Memory aids or mnemonics' : ''}
5. Related concepts or connections
6. Study tips

Format the response in a clear, structured manner that's easy to study from.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educational tutor who creates clear, structured review notes for flashcards. Your notes should be concise yet comprehensive, organized in a logical flow that aids learning and retention."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.6,
    });
    
    const reviewNotes = completion.choices[0].message.content;
    
    // Update flashcard with AI review notes
    await db.execute(
      'UPDATE flashcards SET ai_review_notes = ? WHERE id = ?',
      [reviewNotes, flashcardId]
    );
    
    res.json({
      flashcard_id: flashcardId,
      review_notes: reviewNotes,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate review notes error:', error);
    res.status(500).json({ error: 'Failed to generate review notes' });
  }
});

// Generate AI review notes for an entire set
router.post('/review-notes-set/:setId', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const { include_examples = true, include_mnemonics = true } = req.body;
    
    const db = getDB();
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('viewer', 'editor', 'owner'))`,
      [req.user.id, setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const set = sets[0];
    
    // Get all flashcards in the set
    const [flashcards] = await db.execute(
      'SELECT * FROM flashcards WHERE set_id = ? ORDER BY created_at ASC',
      [setId]
    );
    
    if (flashcards.length === 0) {
      return res.status(404).json({ error: 'No flashcards found in this set' });
    }
    
    if (!openai) {
      return res.status(503).json({ error: 'AI service not available' });
    }
    
    // Generate comprehensive set review notes
    const prompt = `Generate comprehensive review notes for the following flashcard set:

Set Title: ${set.title}
Description: ${set.description || 'No description'}
Tags: ${set.tags?.join(', ') || 'None'}
Number of Cards: ${flashcards.length}

Flashcards:
${flashcards.map((card, index) => `${index + 1}. Term: ${card.term} | Description: ${card.description}`).join('\n')}

Please provide:
1. Overall set summary and key themes
2. Important concepts to focus on
3. Connections between different cards
4. Study strategies for this set
5. Common pitfalls or areas of confusion
6. ${include_examples ? 'Practical examples that connect multiple concepts' : ''}
7. ${include_mnemonics ? 'Memory techniques for this subject area' : ''}

Format the response in a clear, structured manner that's easy to study from.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educational tutor who creates comprehensive review notes for entire flashcard sets. Your notes should provide a holistic understanding of the subject matter and help students see connections between concepts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.6,
    });
    
    const setReviewNotes = completion.choices[0].message.content;
    
    // Store set review notes (you might want to create a separate table for this)
    // For now, we'll store it in the set description or create a new field
    
    res.json({
      set_id: setId,
      set_review_notes: setReviewNotes,
      generated_at: new Date().toISOString(),
      flashcards_processed: flashcards.length
    });
  } catch (error) {
    console.error('Generate set review notes error:', error);
    res.status(500).json({ error: 'Failed to generate set review notes' });
  }
});

// Get AI-generated insights for study recommendations
router.get('/study-insights/:setId', authenticateUser, async (req, res) => {
  try {
    const { setId } = req.params;
    const db = getDB();
    
    // Check if user has access to this set
    const [sets] = await db.execute(
      `SELECT s.* FROM sets s
       LEFT JOIN collaborators c ON s.id = c.set_id AND c.user_id = ?
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('viewer', 'editor', 'owner'))`,
      [req.user.id, setId, req.user.id]
    );
    
    if (sets.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get study progress data
    const [progress] = await db.execute(
      `SELECT 
         sp.*,
         f.term,
         f.description,
         f.ai_review_notes
       FROM study_progress sp
       JOIN flashcards f ON sp.flashcard_id = f.id
       WHERE f.set_id = ? AND sp.user_id = ?
       ORDER BY sp.last_studied DESC`,
      [setId, req.user.id]
    );
    
    // Get recent study sessions
    const [sessions] = await db.execute(
      `SELECT * FROM study_sessions 
       WHERE set_id = ? AND user_id = ?
       ORDER BY started_at DESC
       LIMIT 10`,
      [setId, req.user.id]
    );
    
    if (!openai) {
      return res.status(503).json({ error: 'AI service not available' });
    }
    
    // Generate personalized study insights
    const prompt = `Based on the following study data, provide personalized study recommendations:

Set: ${sets[0].title}
Study Progress: ${progress.length} cards with progress data
Recent Sessions: ${sessions.length} study sessions

Progress Summary:
${progress.map(p => `- ${p.term}: ${p.correct_count} correct, ${p.incorrect_count} incorrect, difficulty: ${p.difficulty_rating}`).join('\n')}

Recent Study Activity:
${sessions.map(s => `- ${s.mode} mode: ${s.cards_studied} cards, ${s.correct_answers} correct, ${Math.round(s.total_time_seconds / 60)} minutes`).join('\n')}

Please provide:
1. Areas that need more focus
2. Recommended study strategies
3. Optimal study timing
4. Difficulty level adjustments
5. Specific cards to review
6. Study mode recommendations

Format as clear, actionable advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert study coach who analyzes learning data to provide personalized, actionable study recommendations. Your advice should be specific, practical, and tailored to the individual's learning patterns."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.5,
    });
    
    const studyInsights = completion.choices[0].message.content;
    
    res.json({
      set_id: setId,
      study_insights: studyInsights,
      generated_at: new Date().toISOString(),
      progress_summary: {
        total_cards: progress.length,
        cards_studied: progress.filter(p => p.last_studied).length,
        average_accuracy: progress.length > 0 ? 
          Math.round(progress.reduce((sum, p) => sum + (p.correct_count / (p.correct_count + p.incorrect_count)), 0) / progress.length * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get study insights error:', error);
    res.status(500).json({ error: 'Failed to get study insights' });
  }
});

export default router;
