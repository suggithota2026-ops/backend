const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Save a multipart file part to disk
 * @param {Object} part - Fastify multipart file part
 * @param {string} subDir - Subdirectory within uploads (e.g., 'categories', 'products')
 * @returns {Promise<string>} - Relative path to the saved file
 */
const saveFile = async (part, subDir = '') => {
    try {
        const uploadPath = path.join(__dirname, '../../', UPLOAD_DIR, subDir);

        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const extension = path.extname(part.filename);
        const fileName = `${Date.now()}_${uuidv4().substring(0, 8)}${extension}`;
        const filePath = path.join(uploadPath, fileName);

        const writer = fs.createWriteStream(filePath);
        await part.file.pipe(writer);

        return `/uploads/${subDir ? subDir + '/' : ''}${fileName}`;
    } catch (error) {
        logger.error('Error saving file:', error);
        throw new Error('Failed to save file');
    }
};

/**
 * Delete a file from disk
 * @param {string} fileUrl - Relative URL of the file (as stored in DB)
 * @returns {Promise<boolean>}
 */
const deleteFile = async (fileUrl) => {
    try {
        if (!fileUrl) return false;

        // Convert /uploads/path/to/file to local path
        const relativePath = fileUrl.replace('/uploads/', '');
        const filePath = path.join(__dirname, '../../', UPLOAD_DIR, relativePath);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    } catch (error) {
        logger.error('Error deleting file:', error);
        return false;
    }
};

module.exports = {
    saveFile,
    deleteFile
};
