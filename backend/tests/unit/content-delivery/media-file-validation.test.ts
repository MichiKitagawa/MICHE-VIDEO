import { validateMediaFile } from '@/lib/upload/validation';

describe('Media File Validation', () => {
  describe('File Type Validation', () => {
    it('should accept valid video file types (MP4)', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024 // 100MB
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept valid video file types (MOV)', () => {
      const result = validateMediaFile({
        filename: 'video.mov',
        mimetype: 'video/quicktime',
        size: 50 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept valid video file types (AVI)', () => {
      const result = validateMediaFile({
        filename: 'video.avi',
        mimetype: 'video/x-msvideo',
        size: 75 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept valid video file types (MKV)', () => {
      const result = validateMediaFile({
        filename: 'video.mkv',
        mimetype: 'video/x-matroska',
        size: 200 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid file types (PDF)', () => {
      const result = validateMediaFile({
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 10 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_file_type');
      expect(result.message).toContain('MP4, MOV, AVI, MKV');
    });

    it('should reject invalid file types (image)', () => {
      const result = validateMediaFile({
        filename: 'image.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_file_type');
    });
  });

  describe('File Size Validation', () => {
    it('should accept file within size limit (5GB for video)', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/mp4',
        size: 4 * 1024 * 1024 * 1024 // 4GB
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject file exceeding size limit (> 5GB)', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/mp4',
        size: 6 * 1024 * 1024 * 1024 // 6GB
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('file_too_large');
      expect(result.message).toContain('5GB');
    });

    it('should accept file at exactly size limit (5GB)', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/mp4',
        size: 5 * 1024 * 1024 * 1024 // 5GB
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject empty file', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/mp4',
        size: 0
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('file_empty');
    });
  });

  describe('Short Video Size Validation', () => {
    it('should accept short video within 200MB limit', () => {
      const result = validateMediaFile({
        filename: 'short.mp4',
        mimetype: 'video/mp4',
        size: 150 * 1024 * 1024, // 150MB
        contentType: 'short'
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject short video exceeding 200MB', () => {
      const result = validateMediaFile({
        filename: 'short.mp4',
        mimetype: 'video/mp4',
        size: 250 * 1024 * 1024, // 250MB
        contentType: 'short'
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('file_too_large');
      expect(result.message).toContain('200MB');
    });
  });

  describe('Filename Validation', () => {
    it('should accept valid filename with alphanumeric characters', () => {
      const result = validateMediaFile({
        filename: 'my_video_2024.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
    });

    it('should accept Unicode filename (Japanese)', () => {
      const result = validateMediaFile({
        filename: 'プログラミング講座.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
    });

    it('should sanitize dangerous characters in filename', () => {
      const result = validateMediaFile({
        filename: '../../../etc/passwd.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitizedFilename).not.toContain('..');
      expect(result.sanitizedFilename).not.toContain('/');
    });

    it('should reject filename exceeding 255 characters', () => {
      const longFilename = 'a'.repeat(256) + '.mp4';
      const result = validateMediaFile({
        filename: longFilename,
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('filename_too_long');
    });
  });

  describe('Security Validation', () => {
    it('should reject executable files with video extension', () => {
      const result = validateMediaFile({
        filename: 'malware.mp4.exe',
        mimetype: 'application/x-msdownload',
        size: 1 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_file_type');
    });

    it('should reject files with null bytes in filename', () => {
      const result = validateMediaFile({
        filename: 'video\0.mp4',
        mimetype: 'video/mp4',
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('invalid_filename');
    });

    it('should validate content type matches file extension', () => {
      const result = validateMediaFile({
        filename: 'video.mp4',
        mimetype: 'video/avi', // Mismatch
        size: 100 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('mimetype_mismatch');
    });
  });
});
