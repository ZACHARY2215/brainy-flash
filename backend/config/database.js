import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'brainy_flash',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
let pool;

export const connectDB = async () => {
  try {
    // First, connect without database to create it if it doesn't exist
    const tempConfig = { ...dbConfig };
    delete tempConfig.database;
    
    const tempPool = mysql.createPool(tempConfig);
    
    // Create database if it doesn't exist
    await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await tempPool.end();
    
    // Now connect to the specific database
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✅ MySQL database connected successfully');
    connection.release();
    
    // Create tables
    await createTables();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const getDB = () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return pool;
};

const createTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username)
      )
    `);
    
    // Sets table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sets (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        tags JSON,
        is_public BOOLEAN DEFAULT FALSE,
        is_collaborative BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_public (is_public),
        INDEX idx_title (title)
      )
    `);
    
    // Flashcards table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS flashcards (
        id VARCHAR(36) PRIMARY KEY,
        set_id VARCHAR(36) NOT NULL,
        term TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE,
        INDEX idx_set_id (set_id),
        FULLTEXT idx_term_desc (term, description)
      )
    `);
    
    // Study sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        set_id VARCHAR(36) NOT NULL,
        mode ENUM('flashcard', 'multiple_choice', 'written') NOT NULL,
        cards_studied INT DEFAULT 0,
        correct_answers INT DEFAULT 0,
        total_time_seconds INT DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_set_id (set_id),
        INDEX idx_started_at (started_at)
      )
    `);
    
    // Study progress table (for individual card progress)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_progress (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        flashcard_id VARCHAR(36) NOT NULL,
        correct_count INT DEFAULT 0,
        incorrect_count INT DEFAULT 0,
        last_studied TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        difficulty_rating ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_card (user_id, flashcard_id),
        INDEX idx_user_id (user_id),
        INDEX idx_flashcard_id (flashcard_id)
      )
    `);
    
    // Favorites table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        set_id VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_set (user_id, set_id),
        INDEX idx_user_id (user_id),
        INDEX idx_set_id (set_id)
      )
    `);
    
    // Collaborators table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS collaborators (
        id VARCHAR(36) PRIMARY KEY,
        set_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        permission ENUM('read', 'write', 'admin') DEFAULT 'read',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_set_user (set_id, user_id),
        INDEX idx_set_id (set_id),
        INDEX idx_user_id (user_id)
      )
    `);
    
    connection.release();
    console.log('✅ Database tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

export default pool;
