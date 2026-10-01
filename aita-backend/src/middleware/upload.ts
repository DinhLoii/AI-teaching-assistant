// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { randomUUID } from 'crypto';

// const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

// // Ensure the directory exists
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const id = randomUUID();
//     cb(null, `${id}${ext}`);
//   },
// });

// export const uploadMiddleware = multer({
//   storage,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB limit
//   },
//   fileFilter: (_req, file, cb) => {
//     const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.sql', '.zip', '.rar', '.7z'];
//     const ext = path.extname(file.originalname).toLowerCase();
//     const allowedMimeTypes = [
//       'application/pdf',
//       'application/msword',
//       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//       'text/plain',
//       'application/sql',
//       'text/x-sql',
//       'application/zip',
//       'application/x-zip-compressed',
//       'application/x-zip',
//       'multipart/x-zip',
//       'application/x-rar-compressed',
//       'application/x-7z-compressed',
//     ];
//     if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Allowed formats: PDF, DOCX, DOC, TXT, SQL, ZIP, RAR, 7Z.'));
//     }
//   },
// });

// const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
// if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
//   fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
// }

// const avatarStorage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, AVATAR_UPLOAD_DIR);
//   },
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const id = randomUUID();
//     cb(null, `${id}${ext}`);
//   },
// });

// export const uploadAvatarMiddleware = multer({
//   storage: avatarStorage,
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB limit
//   },
//   fileFilter: (_req, file, cb) => {
//     const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
//     if (allowedMimeTypes.includes(file.mimetype)) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
//     }
//   },
// });

// const EXCEL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'imports');
// if (!fs.existsSync(EXCEL_UPLOAD_DIR)) {
//   fs.mkdirSync(EXCEL_UPLOAD_DIR, { recursive: true });
// }

// const excelStorage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, EXCEL_UPLOAD_DIR);
//   },
//   filename: (_req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     const id = randomUUID();
//     cb(null, `${id}${ext}`);
//   },
// });

// export const uploadExcelMiddleware = multer({
//   storage: excelStorage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
//   fileFilter: (_req, file, cb) => {
//     const allowedMimeTypes = [
//       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
//       'application/vnd.ms-excel', // xls
//       'text/csv', // csv
//     ];
//     if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.csv')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
//     }
//   },
// });


import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'attachments');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.sql', '.zip', '.rar', '.7z'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/sql',
      'text/x-sql',
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'multipart/x-zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ];
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed formats: PDF, DOCX, DOC, TXT, SQL, ZIP, RAR, 7Z.'));
    }
  },
});

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  },
});

export const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
    }
  },
});

const EXCEL_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'imports');
if (!fs.existsSync(EXCEL_UPLOAD_DIR)) {
  fs.mkdirSync(EXCEL_UPLOAD_DIR, { recursive: true });
}

const excelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, EXCEL_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = randomUUID();
    cb(null, `${id}${ext}`);
  },
});

export const uploadExcelMiddleware = multer({
  storage: excelStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'application/vnd.ms-excel', // xls
      'text/csv', // csv
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  },
});