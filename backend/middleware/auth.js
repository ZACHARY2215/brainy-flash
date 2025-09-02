import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { getDB } from '../config/database.js';

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Set user info in request object
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    req.user = null;
    next();
  }
};

export const requireOwnership = (resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    let idParam;
    let tableName;
    
    switch (resourceType) {
      case 'set':
        idParam = req.params.id;
        tableName = 'sets';
        break;
      case 'flashcard':
        idParam = req.params.id;
        tableName = 'flashcards';
        break;
      default:
        idParam = req.params.id;
        tableName = resourceType;
    }
    
    const db = getDB();
    
    // Check if user owns the resource
    db.execute(
      `SELECT user_id FROM ${tableName} WHERE id = ?`,
      [idParam]
    )
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }
      
      if (rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    })
    .catch((error) => {
      console.error('Ownership check error:', error);
      res.status(500).json({ error: 'Failed to verify ownership' });
    });
  };
};

export const requireCollaboration = (resourceType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    let idParam;
    let tableName;
    
    switch (resourceType) {
      case 'set':
        idParam = req.params.id;
        tableName = 'sets';
        break;
      default:
        idParam = req.params.id;
        tableName = resourceType;
    }
    
    const db = getDB();
    
    // Check if user owns the resource or is a collaborator
    db.execute(
      `SELECT user_id FROM ${tableName} WHERE id = ?`,
      [idParam]
    )
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: `${resourceType} not found` });
      }
      
      // If user owns the resource, allow access
      if (rows[0].user_id === req.user.id) {
        return next();
      }
      
      // Check if user is a collaborator
      return db.execute(
        'SELECT permission FROM collaborators WHERE set_id = ? AND user_id = ?',
        [idParam, req.user.id]
      );
    })
    .then((collaborator) => {
      if (collaborator && collaborator[0] && collaborator[0].length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    })
    .catch((error) => {
      console.error('Collaboration check error:', error);
      res.status(500).json({ error: 'Failed to verify collaboration' });
    });
  };
};
