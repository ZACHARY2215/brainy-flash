import express from 'express';
import OpenAI from 'openai';
import { authenticateUser } from '../middleware/auth.js';
import { getDB } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
       WHERE s.id = ? AND (s.user_id = ? OR c.permission IN ('write', 'admin'))`,
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
      
      flashcards = [...flashcards, ...aiFlashcards].slice(0, count);
    }
    
    // Save flashcards to database
    const savedFlashcards = [];
    for (const card of flashcards) {
      const flashcardId = uuidv4();
      
      await db.execute(
        'INSERT INTO flashcards (id, set_id, term, description) VALUES (?, ?, ?, ?)',
        [flashcardId, set_id, card.term, card.description]
      );
      
      savedFlashcards.push({
        id: flashcardId,
        set_id,
        term: card.term,
        description: card.description,
        created_at: new Date()
      });
    }
    
    res.json({
      message: `Generated ${savedFlashcards.length} flashcards`,
      flashcards: savedFlashcards
    });
    
  } catch (error) {
    console.error('AI generation error:', error);
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
    if (distractors.length < count) {
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
    
    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
    
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

export default router;
