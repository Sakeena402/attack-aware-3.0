import multer from 'multer';

// Store the uploaded file in memory (not on disk) — we only need to parse it once, then discard
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

export const uploadExcel = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx or .xls files are allowed'));
    }
  },
}).single('file'); // frontend will send the file under the field name "file"