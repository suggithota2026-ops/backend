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
      // Prepare default options but exclude any problematic transformations from options
      const { transformation: incomingTransformation, ...otherOptions } = options;
      
      const defaultOptions = {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'uploads',
        resource_type: 'auto', // Automatically detect file type
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        // Image optimization - removed fetch_format: 'auto' as it causes issues with data URLs
        transformation: [
          {
            quality: 'auto:good' // Auto quality optimization
          }
        ],
        // Security
        invalidate: true,
        ...otherOptions
      };
      
      // If there are incoming transformations, merge them but remove fetch_format
      if (incomingTransformation && Array.isArray(incomingTransformation)) {
        defaultOptions.transformation = defaultOptions.transformation.concat(
          incomingTransformation.map(t => {
            const { fetch_format, ...safeTransform } = t; // Remove fetch_format
            return safeTransform;
          })
        );
      }

      // Handle both file path strings and Buffer objects
      return new Promise((resolve, reject) => {
        let uploadSource = file;
        
        if (Buffer.isBuffer(file)) {
          // For buffer objects, convert to data URL format with proper MIME type detection
          const base64 = file.toString('base64');
          
          // Try to detect MIME type from buffer
          let mimeType = 'application/octet-stream';
          
          // Check for common image signatures
          if (file.slice(0, 4).toString('hex').startsWith('ffd8')) {
            mimeType = 'image/jpeg';
          } else if (file.slice(0, 4).toString('hex').startsWith('8950')) {
            mimeType = 'image/png';
          } else if (file.slice(0, 4).toString('hex').startsWith('4749')) {
            mimeType = 'image/gif';
          } else if (file.slice(0, 4).toString('hex').startsWith('5249')) {
            mimeType = 'image/webp';
          }
          
          uploadSource = `data:${mimeType};base64,${base64}`;
        }
        
        cloudinary.uploader.upload(uploadSource, defaultOptions, (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          } else {
            logger.info(`File uploaded successfully: ${result.public_id}`);
            resolve({
              success: true,
              url: result.secure_url,
              publicId: result.public_id,
              originalFilename: result.original_filename,
              format: result.format,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              resourceType: result.resource_type
            });
          }
        });
      });
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
    // Create options without fetch_format to avoid issues with data URLs
    const imageOptions = {
      resource_type: 'image',
      transformation: [
        {
          quality: options.quality || 'auto:good',
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
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            reject(new Error(`Delete failed: ${error.message}`));
          } else {
            resolve(result);
          }
        });
      });
      
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
    // Handle both Multer and Fastify multipart file objects
    let mimetype = file.mimetype || file.type;
    let fileSize = file.size || (file.file && file.file.bytes ? file.file.bytes : 0);
    
    // Check file type
    if (!allowedTypes.includes(mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    // Check file size
    if (fileSize > maxSize) {
      return {
        isValid: false,
        error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
      };
    }

    return { isValid: true };
  }
}

module.exports = new CloudinaryService();