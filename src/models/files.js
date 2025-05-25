const { db } = require('../config/database');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');

class FileManager {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB in bytes
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedFileTypes = [
      ...this.allowedImageTypes,
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip'
    ];
  }

  async initialize() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
      throw error;
    }
  }

  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    return `${timestamp}-${randomString}${extension}`;
  }

  async validateFile(file) {
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds the 10MB limit');
    }

    if (!this.allowedFileTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }

    return true;
  }

  async saveFile(file, userId) {
    await this.validateFile(file);

    const fileName = this.generateFileName(file.name);
    const filePath = path.join(this.uploadDir, fileName);

    try {
      // Save file to disk
      await fs.writeFile(filePath, file.data);

      // Calculate file hash for integrity
      const fileHash = crypto
        .createHash('sha256')
        .update(file.data)
        .digest('hex');

      // Save file metadata to database
      const [savedFile] = await db('files')
        .insert({
          original_name: file.name,
          file_name: fileName,
          file_path: filePath,
          mime_type: file.type,
          size: file.size,
          hash: fileHash,
          uploaded_by: userId,
          created_at: new Date()
        })
        .returning('*');

      return {
        id: savedFile.id,
        originalName: savedFile.original_name,
        mimeType: savedFile.mime_type,
        size: savedFile.size
      };
    } catch (error) {
      // Cleanup file if database save fails
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
      throw error;
    }
  }

  async getFile(fileId, userId) {
    const file = await db('files')
      .where('id', fileId)
      .first();

    if (!file) {
      throw new Error('File not found');
    }

    // Verify file integrity
    const fileData = await fs.readFile(file.file_path);
    const fileHash = crypto
      .createHash('sha256')
      .update(fileData)
      .digest('hex');

    if (fileHash !== file.hash) {
      throw new Error('File integrity check failed');
    }

    return {
      data: fileData,
      fileName: file.original_name,
      mimeType: file.mime_type
    };
  }

  async deleteFile(fileId, userId) {
    const file = await db('files')
      .where({ id: fileId, uploaded_by: userId })
      .first();

    if (!file) {
      throw new Error('File not found or unauthorized');
    }

    try {
      await fs.unlink(file.file_path);
      await db('files')
        .where('id', fileId)
        .delete();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

module.exports = new FileManager(); 