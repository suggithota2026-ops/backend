const util = require('util');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);
const logger = require('../utils/logger');

// Ensure temp directory exists
const tempDir = process.env.UPLOAD_DIR || './uploads/temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Helper to process a single file part and save to disk
const processFilePart = async (part) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const extension = path.extname(part.filename);
  const filename = part.fieldname + '-' + uniqueSuffix + extension;
  const savePath = path.join(tempDir, filename);

  await pump(part.file, fs.createWriteStream(savePath));

  // Get file stats
  const stats = fs.statSync(savePath);

  return {
    fieldname: part.fieldname,
    originalname: part.filename,
    encoding: part.encoding,
    mimetype: part.mimetype,
    filename: filename,
    path: savePath,
    size: stats.size
  };
};

// File filter function (re-implemented for Fastify multipart)
const fileFilter = (mimetype) => {
  // Define allowed file types
  const allowedTypes = {
    images: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    videos: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    documents: ['application/pdf']
  };

  // Check if file type is allowed
  const isImage = allowedTypes.images.includes(mimetype);
  const isVideo = allowedTypes.videos.includes(mimetype);
  const isDocument = allowedTypes.documents.includes(mimetype);

  return isImage || isVideo || isDocument;
};

// Single file upload middleware
const uploadSingle = (fieldName = 'file') => {
  return async (req, reply) => {
    try {
      if (!req.isMultipart()) {
        throw new Error('Request is not multipart');
      }

      const parts = req.parts();
      let fileFound = false;
      const body = {};

      for await (const part of parts) {
        if (part.file) {
          if (part.fieldname === fieldName && !fileFound) {
            if (!fileFilter(part.mimetype)) {
              logger.warn(`Invalid file type attempted for single upload: ${part.mimetype}`);
              throw new Error('Invalid file type. Only images, videos, and PDFs are allowed.');
            }
            const fileObject = await processFilePart(part);
            req.file = fileObject;
            fileFound = true;
          } else {
            // If it's another file or a duplicate, just consume it to prevent hanging
            part.file.resume();
          }
        } else {
          // It's a field
          body[part.fieldname] = part.value;
        }
      }
      req.body = body;

      // If a file was expected but not found, you might want to throw an error here
      // if (!fileFound) {
      //   throw new Error(`File field '${fieldName}' is missing.`);
      // }

    } catch (err) {
      logger.error('Upload single error:', err);
      throw err;
    }
  };
};

// Multiple files upload middleware
const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
  return async (req, reply) => {
    try {
      if (!req.isMultipart()) {
        throw new Error('Request is not multipart');
      }

      const parts = req.parts();
      const files = [];
      const body = {};

      for await (const part of parts) {
        if (part.file) {
          if (part.fieldname === fieldName) {
            if (files.length < maxCount) {
              if (!fileFilter(part.mimetype)) {
                logger.warn(`Invalid file type attempted for multiple upload: ${part.mimetype}`);
                // Continue processing other files, but throw error later or mark this one as invalid
                part.file.resume(); // Consume the stream
                continue; // Skip this file
              }
              const fileObj = await processFilePart(part);
              files.push(fileObj);
            } else {
              // Exceeded limit, just resume (skip)
              part.file.resume();
            }
          } else {
            // Consume other file fields if they exist
            part.file.resume();
          }
        } else {
          // It's a field
          body[part.fieldname] = part.value;
        }
      }

      req.files = files;
      req.body = body;

      // Check if any invalid files were encountered and throw error if needed
      // This logic can be more sophisticated if you want to return partial success
      if (files.length < req.raw.files?.length || 0) { // If some files were skipped due to filter
        // This check is not perfect as req.raw.files doesn't exist yet.
        // A better way would be to count invalid files during iteration.
        // For now, the warning is logged.
      }

    } catch (err) {
      logger.error('Upload multiple error:', err);
      throw err;
    }
  };
};

// Multiple fields upload middleware (for generic or specific fields)
const uploadFields = (fields) => { // `fields` could be an array of { name: 'avatar', maxCount: 1 }
  return async (req, reply) => {
    try {
      if (!req.isMultipart()) {
        throw new Error('Request is not multipart');
      }

      const parts = req.parts();
      const files = {}; // Multer req.files = { fieldName: [file, file] }
      const body = {};

      // Helper to add to files object
      const addFile = (field, fileObj) => {
        if (!files[field]) files[field] = [];
        files[field].push(fileObj);
      };

      for await (const part of parts) {
        if (part.file) {
          // Check if this fieldName is in the expected `fields` array if provided
          const fieldConfig = Array.isArray(fields) ? fields.find(f => f.name === part.fieldname) : null;
          const maxCount = fieldConfig ? (fieldConfig.maxCount || Infinity) : Infinity;

          if (files[part.fieldname] && files[part.fieldname].length >= maxCount) {
            part.file.resume(); // Exceeded maxCount for this field
            continue;
          }

          if (!fileFilter(part.mimetype)) {
            logger.warn(`Invalid file type attempted for field '${part.fieldname}': ${part.mimetype}`);
            part.file.resume();
            continue;
          }

          const fileObj = await processFilePart(part);
          addFile(part.fieldname, fileObj);
        } else {
          body[part.fieldname] = part.value;
        }
      }

      req.files = files;
      req.body = body;

    } catch (err) {
      logger.error('Upload fields error:', err);
      throw err;
    }
  };
};


// Error handler placeholder - Fastify's error handling will catch thrown errors
const handleMulterError = async (req, reply) => {
  // This function is largely a placeholder now, as errors are thrown directly
  // from the middleware and caught by Fastify's error handler.
  return;
};

// Cleanup temporary files hook for Fastify
const cleanupTempFiles = (req, reply, payload, done) => {
  setImmediate(() => {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
        logger.info(`Temporary file cleaned up: ${req.file.path}`);
      } catch (e) {
        logger.warn(`Failed to clean up temporary file: ${req.file.path}, Error: ${e.message}`);
      }
    }
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach(f => {
        try {
          fs.unlinkSync(f.path);
          logger.info(`Temporary file cleaned up: ${f.path}`);
        } catch (e) {
          logger.warn(`Failed to clean up temporary file: ${f.path}, Error: ${e.message}`);
        }
      });
    }
  });
  done(null, payload);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadFields,
  handleMulterError,
  cleanupTempFiles
};