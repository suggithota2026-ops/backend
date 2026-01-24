const cloudinaryService = require('../services/cloudinary.service');
const logger = require('../utils/logger');

/**
 * Upload single file
 */
const uploadSingleFile = async (req, reply) => {
  try {
    if (!req.file) {
      return reply.status(400).send({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Validate file
    const validation = cloudinaryService.validateFile(req.file);
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        message: validation.error
      });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinaryService.uploadFile(req.file.path, {
      folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/general`,
      public_id: req.file.filename.split('.')[0]
    });

    reply.status(200).send({
      success: true,
      message: 'File uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    logger.error('Single file upload error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload multiple files
 */
const uploadMultipleFiles = async (req, reply) => {
  try {
    if (!req.files || req.files.length === 0) {
      return reply.status(400).send({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadResults = [];

    // Process each file
    for (const file of req.files) {
      try {
        // Validate file
        const validation = cloudinaryService.validateFile(file);
        if (!validation.isValid) {
          logger.warn(`File validation failed: ${validation.error}`);
          continue;
        }

        // Upload to Cloudinary
        const result = await cloudinaryService.uploadFile(file.path, {
          folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/general`,
          public_id: file.filename.split('.')[0]
        });

        uploadResults.push(result);
      } catch (fileError) {
        logger.error(`Error uploading file ${file.originalname}:`, fileError);
      }
    }

    if (uploadResults.length === 0) {
      return reply.status(400).send({
        success: false,
        message: 'No files were successfully uploaded'
      });
    }

    reply.status(200).send({
      success: true,
      message: `${uploadResults.length} file(s) uploaded successfully`,
      data: uploadResults,
      totalFiles: req.files.length
    });
  } catch (error) {
    logger.error('Multiple files upload error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Upload failed'
    });
  }
};

/**
 * Upload image with optimization
 */
const uploadImage = async (req, reply) => {
  try {
    if (!req.file) {
      return reply.status(400).send({
        success: false,
        message: 'No image uploaded'
      });
    }

    // Validate that it's an image
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validation = cloudinaryService.validateFile(req.file, allowedImageTypes);
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        message: validation.error
      });
    }

    // Upload optimized image
    const uploadResult = await cloudinaryService.uploadImage(req.file.path, {
      folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/images`,
      public_id: req.file.filename.split('.')[0],
      width: 1920,
      height: 1080,
      quality: 'auto:good'
    });

    reply.status(200).send({
      success: true,
      message: 'Image uploaded and optimized successfully',
      data: uploadResult
    });
  } catch (error) {
    logger.error('Image upload error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Image upload failed'
    });
  }
};

/**
 * Upload video
 */
const uploadVideo = async (req, reply) => {
  try {
    if (!req.file) {
      return reply.status(400).send({
        success: false,
        message: 'No video uploaded'
      });
    }

    // Validate that it's a video
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const validation = cloudinaryService.validateFile(req.file, allowedVideoTypes, 50 * 1024 * 1024); // 50MB for videos
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        message: validation.error
      });
    }

    // Upload video
    const uploadResult = await cloudinaryService.uploadVideo(req.file.path, {
      folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/videos`,
      public_id: req.file.filename.split('.')[0],
      quality: 'auto'
    });

    reply.status(200).send({
      success: true,
      message: 'Video uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    logger.error('Video upload error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Video upload failed'
    });
  }
};

/**
 * Upload PDF document
 */
const uploadPDF = async (req, reply) => {
  try {
    if (!req.file) {
      return reply.status(400).send({
        success: false,
        message: 'No PDF uploaded'
      });
    }

    // Validate that it's a PDF
    const validation = cloudinaryService.validateFile(req.file, ['application/pdf']);
    if (!validation.isValid) {
      return reply.status(400).send({
        success: false,
        message: validation.error
      });
    }

    // Upload PDF
    const uploadResult = await cloudinaryService.uploadPDF(req.file.path, {
      folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/documents`,
      public_id: req.file.filename.split('.')[0]
    });

    reply.status(200).send({
      success: true,
      message: 'PDF uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    logger.error('PDF upload error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'PDF upload failed'
    });
  }
};

/**
 * Delete file from Cloudinary
 */
const deleteFile = async (req, reply) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return reply.status(400).send({
        success: false,
        message: 'Public ID is required'
      });
    }

    const result = await cloudinaryService.deleteFile(publicId);

    reply.status(200).send({
      success: true,
      message: result.message
    });
  } catch (error) {
    logger.error('File deletion error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'File deletion failed'
    });
  }
};

/**
 * Get file information
 */
const getFileInfo = async (req, reply) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return reply.status(400).send({
        success: false,
        message: 'Public ID is required'
      });
    }

    const fileInfo = await cloudinaryService.getFileInfo(publicId);

    reply.status(200).send({
      success: true,
      data: fileInfo
    });
  } catch (error) {
    logger.error('Get file info error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Failed to get file information'
    });
  }
};

/**
 * Generate optimized image URL
 */
const getOptimizedImageUrl = async (req, reply) => {
  try {
    const { publicId } = req.params;
    const { width, height, quality, format } = req.query;

    if (!publicId) {
      return reply.status(400).send({
        success: false,
        message: 'Public ID is required'
      });
    }

    const transformations = {};
    if (width) transformations.width = parseInt(width);
    if (height) transformations.height = parseInt(height);
    if (quality) transformations.quality = quality;
    if (format) transformations.fetch_format = format;

    const optimizedUrl = cloudinaryService.generateImageUrl(publicId, transformations);

    reply.status(200).send({
      success: true,
      url: optimizedUrl,
      transformations: transformations
    });
  } catch (error) {
    logger.error('Generate optimized URL error:', error);
    reply.status(500).send({
      success: false,
      message: error.message || 'Failed to generate optimized URL'
    });
  }
};

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  uploadImage,
  uploadVideo,
  uploadPDF,
  deleteFile,
  getFileInfo,
  getOptimizedImageUrl
};