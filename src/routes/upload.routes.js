const uploadController = require('../controllers/upload.controller');
const { 
  uploadSingle, 
  uploadMultiple, 
  uploadFields, 
  handleMulterError,
  cleanupTempFiles
} = require('../middlewares/upload.middleware');

// Fastify route registration function
const registerUploadRoutes = async (fastify) => {
  // Single file upload
  fastify.post('/single', {
    preHandler: [uploadSingle('file')]
  }, async (req, reply) => {
    try {
      await uploadController.uploadSingleFile(req, reply);
    } catch (error) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return reply.status(400).send({
          success: false,
          message: 'Too many files uploaded. Maximum is 10 files.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return reply.status(400).send({
          success: false,
          message: 'Unexpected field in upload.'
        });
      }
      // Handle file type validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
      // Generic error handling
      return reply.status(500).send({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Multiple files upload
  fastify.post('/multiple', {
    preHandler: [uploadMultiple('files', 10)]
  }, async (req, reply) => {
    try {
      await uploadController.uploadMultipleFiles(req, reply);
    } catch (error) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return reply.status(400).send({
          success: false,
          message: 'Too many files uploaded. Maximum is 10 files.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return reply.status(400).send({
          success: false,
          message: 'Unexpected field in upload.'
        });
      }
      // Handle file type validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
      // Generic error handling
      return reply.status(500).send({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Image upload with optimization
  fastify.post('/image', {
    preHandler: [uploadSingle('image')]
  }, async (req, reply) => {
    try {
      await uploadController.uploadImage(req, reply);
    } catch (error) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return reply.status(400).send({
          success: false,
          message: 'Too many files uploaded. Maximum is 10 files.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return reply.status(400).send({
          success: false,
          message: 'Unexpected field in upload.'
        });
      }
      // Handle file type validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
      // Generic error handling
      return reply.status(500).send({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Video upload
  fastify.post('/video', {
    preHandler: [uploadSingle('video')]
  }, async (req, reply) => {
    try {
      await uploadController.uploadVideo(req, reply);
    } catch (error) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return reply.status(400).send({
          success: false,
          message: 'Too many files uploaded. Maximum is 10 files.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return reply.status(400).send({
          success: false,
          message: 'Unexpected field in upload.'
        });
      }
      // Handle file type validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
      // Generic error handling
      return reply.status(500).send({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // PDF upload
  fastify.post('/pdf', {
    preHandler: [uploadSingle('document')]
  }, async (req, reply) => {
    try {
      await uploadController.uploadPDF(req, reply);
    } catch (error) {
      // Handle multer errors
      if (error.code === 'LIMIT_FILE_SIZE') {
        return reply.status(400).send({
          success: false,
          message: 'File too large. Maximum size is 5MB.'
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return reply.status(400).send({
          success: false,
          message: 'Too many files uploaded. Maximum is 10 files.'
        });
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return reply.status(400).send({
          success: false,
          message: 'Unexpected field in upload.'
        });
      }
      // Handle file type validation errors
      if (error.message && error.message.includes('Invalid file type')) {
        return reply.status(400).send({
          success: false,
          message: error.message
        });
      }
      // Generic error handling
      return reply.status(500).send({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  });

  // Delete file
  fastify.delete('/:publicId', uploadController.deleteFile);

  // Get file information
  fastify.get('/info/:publicId', uploadController.getFileInfo);

  // Get optimized image URL
  fastify.get('/optimized/:publicId', uploadController.getOptimizedImageUrl);
};

module.exports = registerUploadRoutes;