import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, deleteFile } from '../config/supabase.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload image for flashcard
router.post('/image', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `flashcard-images/${req.user.id}/${fileName}`;
    
    // Upload to Supabase Storage
    const publicUrl = await uploadFile(
      'brainy-flash',
      filePath,
      req.file.buffer,
      req.file.mimetype
    );
    
    res.json({
      url: publicUrl,
      file_id: fileId,
      filename: fileName
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload document for AI processing
router.post('/document', authenticateUser, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided' });
    }
    
    const fileId = uuidv4();
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `documents/${req.user.id}/${fileName}`;
    
    // Upload to Supabase Storage
    const publicUrl = await uploadFile(
      'brainy-flash',
      filePath,
      req.file.buffer,
      req.file.mimetype
    );
    
    res.json({
      url: publicUrl,
      file_id: fileId,
      filename: fileName,
      original_name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Delete uploaded file
router.delete('/:fileId', authenticateUser, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Delete from Supabase Storage
    await deleteFile('brainy-flash', filePath);
    
    res.json({ message: 'File deleted successfully' });
    
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
