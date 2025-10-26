import { generateS3Key } from '@/lib/upload/s3';

describe('S3 Key Generator', () => {
  describe('Video S3 Key Generation', () => {
    it('should generate valid S3 key for video upload', () => {
      const userId = 'usr_123456';
      const videoId = 'vid_789012';
      const filename = 'my-video.mp4';

      const s3Key = generateS3Key({
        userId,
        contentId: videoId,
        contentType: 'video',
        filename
      });

      expect(s3Key).toContain('videos/');
      expect(s3Key).toContain(userId);
      expect(s3Key).toContain(videoId);
      expect(s3Key).toMatch(/\.mp4$/);
    });

    it('should include user ID in path', () => {
      const s3Key = generateS3Key({
        userId: 'usr_abc123',
        contentId: 'vid_xyz789',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(s3Key).toContain('usr_abc123');
    });

    it('should include content ID in path', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_unique789',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(s3Key).toContain('vid_unique789');
    });

    it('should preserve file extension', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mov'
      });

      expect(s3Key).toMatch(/\.mov$/);
    });

    it('should generate unique keys for same user and different videos', () => {
      const key1 = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_001',
        contentType: 'video',
        filename: 'test.mp4'
      });

      const key2 = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_002',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(key1).not.toBe(key2);
      expect(key1).toContain('vid_001');
      expect(key2).toContain('vid_002');
    });
  });

  describe('Short S3 Key Generation', () => {
    it('should generate valid S3 key for short upload', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'sht_456',
        contentType: 'short',
        filename: 'short.mp4'
      });

      expect(s3Key).toContain('shorts/');
      expect(s3Key).toContain('usr_123');
      expect(s3Key).toContain('sht_456');
    });

    it('should differentiate between videos and shorts paths', () => {
      const videoKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_789',
        contentType: 'video',
        filename: 'test.mp4'
      });

      const shortKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'sht_789',
        contentType: 'short',
        filename: 'test.mp4'
      });

      expect(videoKey).toContain('videos/');
      expect(shortKey).toContain('shorts/');
    });
  });

  describe('Thumbnail S3 Key Generation', () => {
    it('should generate thumbnail key from video key', () => {
      const videoKey = 'videos/usr_123/vid_456/original.mp4';
      const thumbnailKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'thumbnail.jpg',
        variant: 'thumbnail'
      });

      expect(thumbnailKey).toContain('thumbnails/');
      expect(thumbnailKey).toContain('vid_456');
      expect(thumbnailKey).toMatch(/\.jpg$/);
    });

    it('should generate preview thumbnail key', () => {
      const thumbnailKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'preview.jpg',
        variant: 'preview'
      });

      expect(thumbnailKey).toContain('previews/');
      expect(thumbnailKey).toMatch(/\.jpg$/);
    });
  });

  describe('Transcoded Video S3 Key Generation', () => {
    it('should generate key for 1080p transcoded video', () => {
      const transcodedKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mp4',
        variant: 'transcoded',
        quality: '1080p'
      });

      expect(transcodedKey).toContain('transcoded/');
      expect(transcodedKey).toContain('1080p');
      expect(transcodedKey).toContain('vid_456');
    });

    it('should generate key for 720p transcoded video', () => {
      const transcodedKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mp4',
        variant: 'transcoded',
        quality: '720p'
      });

      expect(transcodedKey).toContain('720p');
    });

    it('should generate key for 480p transcoded video', () => {
      const transcodedKey = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mp4',
        variant: 'transcoded',
        quality: '480p'
      });

      expect(transcodedKey).toContain('480p');
    });

    it('should generate different keys for different qualities', () => {
      const key1080p = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mp4',
        variant: 'transcoded',
        quality: '1080p'
      });

      const key720p = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video.mp4',
        variant: 'transcoded',
        quality: '720p'
      });

      expect(key1080p).not.toBe(key720p);
    });
  });

  describe('Path Sanitization', () => {
    it('should sanitize dangerous characters from filename', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: '../../../etc/passwd.mp4'
      });

      expect(s3Key).not.toContain('..');
      expect(s3Key).not.toContain('etc/passwd');
    });

    it('should remove special characters from filename', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'video@#$%^&*().mp4'
      });

      expect(s3Key).not.toContain('@');
      expect(s3Key).not.toContain('#');
      expect(s3Key).not.toContain('$');
    });

    it('should handle Unicode characters properly', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'プログラミング講座.mp4'
      });

      expect(s3Key).toBeDefined();
      expect(s3Key).toContain('vid_456');
    });

    it('should replace spaces with underscores', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'my video file.mp4'
      });

      expect(s3Key).not.toContain(' ');
      expect(s3Key).toMatch(/_/);
    });
  });

  describe('Netflix Content S3 Key Generation', () => {
    it('should generate key for Netflix movie', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'nc_movie_001',
        contentType: 'netflix',
        filename: 'movie.mp4'
      });

      expect(s3Key).toContain('netflix/');
      expect(s3Key).toContain('nc_movie_001');
    });

    it('should generate key for Netflix episode', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'ep_series_s01e01',
        contentType: 'netflix',
        filename: 'episode.mp4',
        variant: 'episode'
      });

      expect(s3Key).toContain('netflix/');
      expect(s3Key).toContain('ep_series_s01e01');
    });
  });

  describe('Key Format Validation', () => {
    it('should generate key without double slashes', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(s3Key).not.toMatch(/\/\//);
    });

    it('should not start with slash', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(s3Key).not.toMatch(/^\//);
    });

    it('should not end with slash', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'test.mp4'
      });

      expect(s3Key).not.toMatch(/\/$/);
    });

    it('should have consistent format', () => {
      const s3Key = generateS3Key({
        userId: 'usr_123',
        contentId: 'vid_456',
        contentType: 'video',
        filename: 'test.mp4'
      });

      // Format: contentType/userId/contentId/filename
      const parts = s3Key.split('/');
      expect(parts.length).toBeGreaterThanOrEqual(3);
      expect(parts[0]).toBe('videos');
    });
  });
});
