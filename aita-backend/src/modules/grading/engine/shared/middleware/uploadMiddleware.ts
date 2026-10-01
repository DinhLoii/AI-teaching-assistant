// @ts-nocheck
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';

/**
 * Multer storage configuration.
 *
 * Each upload gets a UUID-based filename to avoid collisions.
 * Files are stored in the configured upload directory.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Ensure the directory exists before saving the file
    if (!fs.existsSync(config.paths.uploadDir)) {
      fs.mkdirSync(config.paths.uploadDir, { recursive: true });
    }
    cb(null, config.paths.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * File filter — only accept .zip files.
 */
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedExtensions = ['.zip', '.pdf', '.docx', '.doc', '.txt', '.sql', '.rar', '.7z'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'multipart/x-zip',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/sql',
    'text/x-sql',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed formats: ZIP, PDF, DOCX, DOC, TXT, SQL, RAR, 7Z'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

