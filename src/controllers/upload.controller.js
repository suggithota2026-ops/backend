const fs = require('fs');
const path = require('path');
const cloudinaryService = require('../services/cloudinary.service');
const logger = require('../utils/logger');

// Helper to check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;
};

// Helper for local file handling (Async)
const handleLocalUpload = async (file, subDir = '') => {
  try {
    const uploadsRoot = path.join(__dirname, '../../uploads');
    const targetDir = path.join(uploadsRoot, subDir);

    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, file.filename);

    // Check if source file exists
    if (!fs.existsSync(file.path)) {
      throw new Error(`Source file not found at ${file.path}`);
    }

    // Copy file
    await fs.promises.copyFile(file.path, targetPath);

    // Try to cleanup temp file differently depending on OS locking
    try {
      // Use fs.unlink, but catch if it fails (Windows locking issues)
      fs.unlink(file.path, (err) => {
        if (err) logger.warn(`Failed to cleanup temp file ${file.path}: ${err.message}`);
      });
    } catch (cleanupErr) {
      logger.warn(`Cleanup error: ${cleanupErr.message}`);
    }

    // Return the URL path
    // Assumes app serves 'uploads' at '/uploads/'
    // Normalize path separators to forward slashes for URL
    return `/uploads/${subDir ? subDir + '/' : ''}${file.filename}`;
  } catch (error) {
    logger.error('Local upload handler failed:', error);
    throw new Error('Failed to save file locally');
  }
};

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

    let uploadResult;
    if (isCloudinaryConfigured()) {
      // Upload to Cloudinary
      uploadResult = await cloudinaryService.uploadFile(req.file.path, {
        folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/general`,
        public_id: req.file.filename.split('.')[0]
      });
    } else {
      logger.info('Cloudinary not configured, using local storage (general)');
      const localUrl = await handleLocalUpload(req.file, 'general');
      uploadResult = {
        secure_url: localUrl,
        public_id: req.file.filename,
        url: localUrl,
        format: path.extname(req.file.originalname).substring(1).replace('.', ''),
        original_filename: req.file.originalname,
        resource_type: 'raw'
      };
    }

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
    const useCloudinary = isCloudinaryConfigured();

    // Process each file
    for (const file of req.files) {
      try {
        // Validate file
        const validation = cloudinaryService.validateFile(file);
        if (!validation.isValid) {
          logger.warn(`File validation failed: ${validation.error}`);
          continue;
        }

        let result;
        if (useCloudinary) {
          result = await cloudinaryService.uploadFile(file.path, {
            folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/general`,
            public_id: file.filename.split('.')[0]
          });
        } else {
          const localUrl = await handleLocalUpload(file, 'general');
          result = {
            secure_url: localUrl,
            public_id: file.filename,
            url: localUrl,
            original_filename: file.originalname
          };
        }

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

    let uploadResult;
    if (isCloudinaryConfigured()) {
      // Upload optimized image
      uploadResult = await cloudinaryService.uploadImage(req.file.path, {
        folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/images`,
        public_id: req.file.filename.split('.')[0],
        width: 1920,
        height: 1080,
        quality: 'auto:good'
      });
    } else {
      logger.info('Cloudinary not configured, using local storage (images)');
      const localUrl = await handleLocalUpload(req.file, 'images');
      uploadResult = {
        secure_url: localUrl,
        public_id: req.file.filename,
        url: localUrl,
        format: path.extname(req.file.originalname).substring(1).replace('.', ''),
        width: 0,
        height: 0,
        original_filename: req.file.originalname,
        resource_type: 'image'
      };
    }

    reply.status(200).send({
      success: true,
      message: 'Image uploaded successfully',
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

    let uploadResult;
    if (isCloudinaryConfigured()) {
      const uploadResult = await cloudinaryService.uploadVideo(req.file.path, {
        folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/videos`,
        public_id: req.file.filename.split('.')[0],
        quality: 'auto'
      });
      uploadResult = uploadResult;
    } else {
      logger.info('Cloudinary not configured, using local storage (videos)');
      const localUrl = await handleLocalUpload(req.file, 'videos');
      uploadResult = {
        secure_url: localUrl,
        public_id: req.file.filename,
        url: localUrl,
        format: path.extname(req.file.originalname).substring(1).replace('.', ''),
        original_filename: req.file.originalname,
        resource_type: 'video'
      };
    }

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

    let uploadResult;
    if (isCloudinaryConfigured()) {
      uploadResult = await cloudinaryService.uploadPDF(req.file.path, {
        folder: `${process.env.CLOUDINARY_UPLOAD_FOLDER}/documents`,
        public_id: req.file.filename.split('.')[0]
      });
    } else {
      logger.info('Cloudinary not configured, using local storage (documents)');
      const localUrl = await handleLocalUpload(req.file, 'documents');
      uploadResult = {
        secure_url: localUrl,
        public_id: req.file.filename,
        url: localUrl,
        format: 'pdf',
        original_filename: req.file.originalname,
        resource_type: 'raw'
      };
    }

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
 * Delete file from Cloudinary (or Local)
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

    if (isCloudinaryConfigured()) {
      const result = await cloudinaryService.deleteFile(publicId);
      reply.status(200).send({
        success: true,
        message: result.message
      });
    } else {
      // Local deletion
      // Since we don't store the full path in publicId (it's often just filename), we need to find it.
      // However, for local uploads, we set public_id to filename in handleLocalUpload.
      // We'll search in all 3 subfolders: images, videos, documents, and root.

      const uploadsRoot = path.join(__dirname, '../../uploads');
      // Search
      const possiblePaths = [
        path.join(uploadsRoot, 'images', publicId),
        path.join(uploadsRoot, 'general', publicId),
        path.join(uploadsRoot, 'videos', publicId),
        path.join(uploadsRoot, 'documents', publicId),
        path.join(uploadsRoot, publicId) // unlikely
      ];

      let deleted = false;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          await fs.promises.unlink(p);
          deleted = true;
          break;
        }
      }

      if (deleted) {
        reply.status(200).send({ success: true, message: 'File deleted locally' });
      } else {
        // If we can't find it, maybe it's fine
        reply.status(200).send({ success: true, message: 'File not found locally, but marked as deleted' });
      }
    }

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