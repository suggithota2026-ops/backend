const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Multer configuration for local temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Temporary storage directory
    const tempDir = process.env.UPLOAD_DIR || './uploads/temp';
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    documents: ['application/pdf']
  };

  // Check if file type is allowed
  const isImage = allowedTypes.images.includes(file.mimetype);
  const isVideo = allowedTypes.videos.includes(file.mimetype);
  const isDocument = allowedTypes.documents.includes(file.mimetype);

  if (isImage || isVideo || isDocument) {
    cb(null, true);
  } else {
    logger.warn(`Invalid file type attempted: ${file.mimetype}`);
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10 // Maximum 10 files per request
  }
});

// Single file upload middleware
const uploadSingle = (fieldName = 'file') => {
  return upload.single(fieldName);
};

// Multiple files upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return upload.array(fieldName, maxCount);
};

// Multiple fields upload middleware
const uploadFields = (fields) => {
  return upload.fields(fields);
};

// Error handler for Fastify - This will be called manually in routes
const handleMulterError = async (req, reply) => {
  // This function checks for multer errors after middleware runs
  // In Fastify, multer errors are typically handled differently
  // We'll just return to let the route handle it
  return;
};

// Cleanup temporary files hook for Fastify
const cleanupTempFilesOnSend = (req, reply, payload, done) => {
  // Clean up temporary files after response is sent
  setImmediate(() => {
    if (req.file && req.file.path) {
      // Clean up single file
      try {
        require('fs').unlinkSync(req.file.path);
        logger.info(`Temporary file cleaned up: ${req.file.path}`);
      } catch (err) {
        logger.warn(`Failed to clean up temporary file: ${req.file.path}`);
      }
    }
    
    if (req.files) {
      // Clean up multiple files
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach(file => {
        try {
          require('fs').unlinkSync(file.path);
          logger.info(`Temporary file cleaned up: ${file.path}`);
        } catch (err) {
          logger.warn(`Failed to clean up temporary file: ${file.path}`);
        }
      });
    }
  });
  
  // Continue with the response
  done(null, payload);
};

// Export the onSend version
const cleanupTempFiles = cleanupTempFilesOnSend;

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
  cleanupTempFiles
};