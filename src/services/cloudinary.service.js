const cloudinary = require('cloudinary').v2;
const { promisify } = require('util');
const fs = require('fs');
const logger = require('../utils/logger');

// Load environment variables
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: process.env.CLOUDINARY_SECURE_DELIVERY === 'true'
});

class CloudinaryService {
  constructor() {
    this.upload = promisify(cloudinary.uploader.upload);
    this.destroy = promisify(cloudinary.uploader.destroy);
  }

  /**
   * Upload file to Cloudinary with optimization
   * @param {Buffer|string} file - File buffer or path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, options = {}) {
    try {
      const defaultOptions = {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads',
        resource_type: 'auto', // Automatically detect file type
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        // Image optimization
        transformation: [
          {
            quality: 'auto:good', // Auto quality optimization
            fetch_format: 'auto'  // Auto format conversion (WebP for modern browsers)
          }
        ],
        // Security
        invalidate: true,
        ...options
      };

      const result = await this.upload(file, defaultOptions);
      
      logger.info(`File uploaded successfully: ${result.public_id}`);
      
      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        originalFilename: result.original_filename,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        resourceType: result.resource_type
      };
    } catch (error) {
      logger.error('Cloudinary upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Upload image with specific optimizations
   * @param {Buffer|string} image - Image file
   * @param {Object} options - Custom options
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(image, options = {}) {
    const imageOptions = {
      resource_type: 'image',
      transformation: [
        {
          quality: options.quality || 'auto:good',
          fetch_format: options.format || 'auto',
          crop: options.crop || 'limit',
          width: options.width || 1920,
          height: options.height || 1080
        }
      ],
      ...options
    };

    return await this.uploadFile(image, imageOptions);
  }

  /**
   * Upload video with compression
   * @param {Buffer|string} video - Video file
   * @param {Object} options - Custom options
   * @returns {Promise<Object>} Upload result
   */
  async uploadVideo(video, options = {}) {
    const videoOptions = {
      resource_type: 'video',
      transformation: [
        {
          quality: options.quality || 'auto',
          audio_codec: 'aac',
          audio_frequency: 44100
        }
      ],
      ...options
    };

    return await this.uploadFile(video, videoOptions);
  }

  /**
   * Upload PDF document
   * @param {Buffer|string} pdf - PDF file
   * @param {Object} options - Custom options
   * @returns {Promise<Object>} Upload result
   */
  async uploadPDF(pdf, options = {}) {
    const pdfOptions = {
      resource_type: 'raw',
      format: 'pdf',
      ...options
    };

    return await this.uploadFile(pdf, pdfOptions);
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Public ID of the file
   * @returns {Promise<Object>} Deletion result
   */
  async deleteFile(publicId) {
    try {
      const result = await this.destroy(publicId);
      
      if (result.result === 'ok') {
        logger.info(`File deleted successfully: ${publicId}`);
        return { success: true, message: 'File deleted successfully' };
      } else {
        throw new Error('Deletion failed');
      }
    } catch (error) {
      logger.error('Cloudinary delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate optimized image URL with transformations
   * @param {string} publicId - Public ID of the image
   * @param {Object} transformations - Transformation options
   * @returns {string} Optimized URL
   */
  generateImageUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: 'auto:good',
      fetch_format: 'auto',
      ...transformations
    };

    return cloudinary.url(publicId, {
      transformation: defaultTransformations,
      secure: true
    });
  }

  /**
   * Create folder structure in Cloudinary
   * @param {string} folderPath - Folder path to create
   * @returns {Promise<Object>} Folder creation result
   */
  async createFolder(folderPath) {
    try {
      // Cloudinary creates folders automatically when uploading
      // This method ensures the folder structure exists
      const result = await cloudinary.api.create_folder(folderPath);
      logger.info(`Folder created: ${folderPath}`);
      return result;
    } catch (error) {
      // Folder might already exist, which is fine
      if (error.message.includes('already exists')) {
        return { success: true, message: 'Folder already exists' };
      }
      logger.error('Folder creation error:', error);
      throw error;
    }
  }

  /**
   * Get file info from Cloudinary
   * @param {string} publicId - Public ID of the file
   * @returns {Promise<Object>} File information
   */
  async getFileInfo(publicId) {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at
      };
    } catch (error) {
      logger.error('Get file info error:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }

  /**
   * Validate file type and size
   * @param {Object} file - Multer file object
   * @param {Array} allowedTypes - Allowed MIME types
   * @param {number} maxSize - Maximum file size in bytes
   * @returns {Object} Validation result
   */
  validateFile(file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 5 * 1024 * 1024) {
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      };
    }

    return { isValid: true };
  }
}

module.exports = new CloudinaryService();