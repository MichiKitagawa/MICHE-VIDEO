import {
  calculateRecommendationScore,
  getRecommendationsForVideo,
  personalizeRecommendations
} from '@/lib/video-playback/recommendation';

/**
 * Recommendation Algorithm Unit Tests
 *
 * Tests the recommendation scoring algorithm to ensure:
 * - Scores are calculated based on category matching
 * - Tag matching contributes to score
 * - View count and recency affect rankings
 * - User watch history personalizes recommendations
 *
 * Reference: docs/tests/video-playback-tests.md
 */

describe('Recommendation Algorithm', () => {
  describe('Category Matching', () => {
    it('should boost score for same category videos', () => {
      // Arrange: Current and recommended videos in same category
      const currentVideo = {
        id: 'vid_current',
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      const recommendedVideo = {
        id: 'vid_rec',
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      // Act: Calculate score
      const score = calculateRecommendationScore(currentVideo, recommendedVideo, []);

      // Assert: Should have positive score for category match (40% weight)
      expect(score).toBeGreaterThan(0.3);
    });

    it('should give lower score for different category videos', () => {
      const currentVideo = {
        id: 'vid_current',
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      const recommendedVideo = {
        id: 'vid_rec',
        category: 'gaming',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      const score = calculateRecommendationScore(currentVideo, recommendedVideo, []);

      // Should have lower score without category match
      expect(score).toBeLessThan(0.3);
    });

    it('should compare same vs different category scores', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const sameCategory = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const diffCategory = { category: 'gaming', tags: [], views: 1000, created_at: new Date() };

      const sameCategoryScore = calculateRecommendationScore(current, sameCategory, []);
      const diffCategoryScore = calculateRecommendationScore(current, diffCategory, []);

      expect(sameCategoryScore).toBeGreaterThan(diffCategoryScore);
    });
  });

  describe('Tag Matching', () => {
    it('should boost score based on tag overlap', () => {
      // Arrange: Videos with common tags
      const currentVideo = {
        category: 'education',
        tags: ['programming', 'javascript', 'tutorial'],
        views: 1000,
        created_at: new Date()
      };

      const recommendedVideo = {
        category: 'education',
        tags: ['javascript', 'react', 'tutorial'],
        views: 1000,
        created_at: new Date()
      };

      // Act: Calculate score
      const score = calculateRecommendationScore(currentVideo, recommendedVideo, []);

      // Assert: Should have high score (category + 2 matching tags)
      expect(score).toBeGreaterThan(0.5);
    });

    it('should give higher score for more tag matches', () => {
      const current = {
        category: 'education',
        tags: ['a', 'b', 'c', 'd'],
        views: 1000,
        created_at: new Date()
      };

      const oneMatch = {
        category: 'education',
        tags: ['a', 'x', 'y', 'z'],
        views: 1000,
        created_at: new Date()
      };

      const twoMatches = {
        category: 'education',
        tags: ['a', 'b', 'x', 'y'],
        views: 1000,
        created_at: new Date()
      };

      const scoreOne = calculateRecommendationScore(current, oneMatch, []);
      const scoreTwo = calculateRecommendationScore(current, twoMatches, []);

      expect(scoreTwo).toBeGreaterThan(scoreOne);
    });

    it('should handle videos with no tags', () => {
      const current = {
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      const recommended = {
        category: 'education',
        tags: ['tag1', 'tag2'],
        views: 1000,
        created_at: new Date()
      };

      const score = calculateRecommendationScore(current, recommended, []);

      // Should still score based on category
      expect(score).toBeGreaterThan(0);
    });

    it('should be case-insensitive for tag matching', () => {
      const current = {
        category: 'education',
        tags: ['JavaScript', 'TUTORIAL'],
        views: 1000,
        created_at: new Date()
      };

      const recommended = {
        category: 'education',
        tags: ['javascript', 'tutorial'],
        views: 1000,
        created_at: new Date()
      };

      const score = calculateRecommendationScore(current, recommended, []);

      // Should match despite case difference
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('View Count Weighting', () => {
    it('should boost trending videos with high view counts', () => {
      // Arrange: Trending vs normal video
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const trending = {
        category: 'education',
        tags: [],
        views: 100000, // High views
        created_at: new Date()
      };

      const normal = {
        category: 'education',
        tags: [],
        views: 1000, // Normal views
        created_at: new Date()
      };

      // Act: Calculate scores
      const trendingScore = calculateRecommendationScore(current, trending, []);
      const normalScore = calculateRecommendationScore(current, normal, []);

      // Assert: Trending should score higher
      expect(trendingScore).toBeGreaterThan(normalScore);
    });

    it('should normalize view counts correctly', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const testCases = [
        { views: 10, expectedRange: [0, 0.3] },
        { views: 1000, expectedRange: [0.3, 0.5] },
        { views: 100000, expectedRange: [0.5, 1.0] }
      ];

      testCases.forEach(({ views, expectedRange }) => {
        const video = { category: 'education', tags: [], views, created_at: new Date() };
        const score = calculateRecommendationScore(current, video, []);

        expect(score).toBeGreaterThanOrEqual(expectedRange[0]);
        expect(score).toBeLessThanOrEqual(expectedRange[1]);
      });
    });

    it('should handle zero view count videos', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const zeroViews = { category: 'education', tags: [], views: 0, created_at: new Date() };

      const score = calculateRecommendationScore(current, zeroViews, []);

      // Should still have some score from category match
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Recency Weighting', () => {
    it('should boost recently uploaded videos', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const recent = {
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date() // Just uploaded
      };

      const old = {
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year ago
      };

      const recentScore = calculateRecommendationScore(current, recent, []);
      const oldScore = calculateRecommendationScore(current, old, []);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should handle videos uploaded today vs last week', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const today = {
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date()
      };

      const lastWeek = {
        category: 'education',
        tags: [],
        views: 1000,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };

      const todayScore = calculateRecommendationScore(current, today, []);
      const weekScore = calculateRecommendationScore(current, lastWeek, []);

      expect(todayScore).toBeGreaterThanOrEqual(weekScore);
    });
  });

  describe('User Watch History', () => {
    it('should personalize based on user watch history', () => {
      // Arrange: User with watch history
      const watchHistory = [
        { video_id: 'vid_1', category: 'education', tags: ['programming'] },
        { video_id: 'vid_2', category: 'education', tags: ['javascript'] },
        { video_id: 'vid_3', category: 'technology', tags: ['programming'] }
      ];

      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const educationVideo = {
        category: 'education',
        tags: ['programming'],
        views: 1000,
        created_at: new Date()
      };

      const gamingVideo = {
        category: 'gaming',
        tags: ['esports'],
        views: 1000,
        created_at: new Date()
      };

      // Act: Calculate scores with history
      const eduScore = calculateRecommendationScore(current, educationVideo, watchHistory);
      const gamingScore = calculateRecommendationScore(current, gamingVideo, watchHistory);

      // Assert: Education video should score higher (matches history)
      expect(eduScore).toBeGreaterThan(gamingScore);
    });

    it('should boost videos similar to frequently watched categories', () => {
      const watchHistory = [
        { video_id: 'vid_1', category: 'gaming', tags: [] },
        { video_id: 'vid_2', category: 'gaming', tags: [] },
        { video_id: 'vid_3', category: 'gaming', tags: [] },
        { video_id: 'vid_4', category: 'gaming', tags: [] },
        { video_id: 'vid_5', category: 'education', tags: [] }
      ];

      const current = { category: 'gaming', tags: [], views: 1000, created_at: new Date() };

      const gamingVideo = { category: 'gaming', tags: [], views: 1000, created_at: new Date() };
      const educationVideo = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const gamingScore = calculateRecommendationScore(current, gamingVideo, watchHistory);
      const eduScore = calculateRecommendationScore(current, educationVideo, watchHistory);

      // Gaming appears 4/5 times in history
      expect(gamingScore).toBeGreaterThan(eduScore);
    });

    it('should handle empty watch history', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const recommended = { category: 'education', tags: [], views: 1000, created_at: new Date() };

      const score = calculateRecommendationScore(current, recommended, []);

      // Should still calculate score without history
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Combined Scoring', () => {
    it('should combine all factors for final score', () => {
      // Arrange: Perfect match video
      const current = {
        category: 'education',
        tags: ['programming', 'javascript'],
        views: 1000,
        created_at: new Date()
      };

      const perfectMatch = {
        category: 'education',
        tags: ['programming', 'javascript'],
        views: 50000, // Popular
        created_at: new Date() // Recent
      };

      const watchHistory = [
        { video_id: 'vid_1', category: 'education', tags: ['programming'] }
      ];

      // Act: Calculate score
      const score = calculateRecommendationScore(current, perfectMatch, watchHistory);

      // Assert: Should have very high score
      expect(score).toBeGreaterThan(0.7);
    });

    it('should rank multiple recommendations correctly', () => {
      const current = {
        category: 'education',
        tags: ['programming'],
        views: 1000,
        created_at: new Date()
      };

      const candidates = [
        { id: 'vid_1', category: 'education', tags: ['programming', 'javascript'], views: 10000, created_at: new Date() },
        { id: 'vid_2', category: 'gaming', tags: [], views: 100000, created_at: new Date() },
        { id: 'vid_3', category: 'education', tags: ['python'], views: 5000, created_at: new Date() },
        { id: 'vid_4', category: 'education', tags: ['programming'], views: 50000, created_at: new Date() }
      ];

      const scores = candidates.map(video =>
        calculateRecommendationScore(current, video, [])
      );

      // vid_4 should rank highest (same category, matching tag, high views)
      const maxScore = Math.max(...scores);
      const maxIndex = scores.indexOf(maxScore);

      expect(candidates[maxIndex].id).toBe('vid_4');
    });
  });

  describe('Diversity in Recommendations', () => {
    it('should include some variety in recommendations', () => {
      const { ensureDiversity } = require('@/lib/video-playback/recommendation');

      const recommendations = [
        { id: 'vid_1', category: 'education' },
        { id: 'vid_2', category: 'education' },
        { id: 'vid_3', category: 'education' },
        { id: 'vid_4', category: 'gaming' },
        { id: 'vid_5', category: 'entertainment' }
      ];

      const diverse = ensureDiversity(recommendations, 5);

      // Should maintain some recommendations from different categories
      const categories = new Set(diverse.map(v => v.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values gracefully', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const recommended = { category: undefined, tags: undefined, views: undefined, created_at: undefined };

      const score = calculateRecommendationScore(current, recommended as any, []);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle null values gracefully', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const recommended = { category: null, tags: null, views: null, created_at: null };

      const score = calculateRecommendationScore(current, recommended as any, []);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle extremely large view counts', () => {
      const current = { category: 'education', tags: [], views: 1000, created_at: new Date() };
      const viral = { category: 'education', tags: [], views: 1000000000, created_at: new Date() };

      const score = calculateRecommendationScore(current, viral, []);

      // Should still produce normalized score
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle videos with many tags', () => {
      const current = {
        category: 'education',
        tags: Array(50).fill('tag'),
        views: 1000,
        created_at: new Date()
      };

      const recommended = {
        category: 'education',
        tags: Array(50).fill('tag'),
        views: 1000,
        created_at: new Date()
      };

      const score = calculateRecommendationScore(current, recommended, []);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Recommendation Filtering', () => {
    it('should exclude already watched videos', () => {
      const { filterRecommendations } = require('@/lib/video-playback/recommendation');

      const watchedIds = ['vid_1', 'vid_2', 'vid_3'];
      const candidates = [
        { id: 'vid_1' },
        { id: 'vid_2' },
        { id: 'vid_4' },
        { id: 'vid_5' }
      ];

      const filtered = filterRecommendations(candidates, watchedIds);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(v => v.id)).toEqual(['vid_4', 'vid_5']);
    });

    it('should exclude current video from recommendations', () => {
      const { filterRecommendations } = require('@/lib/video-playback/recommendation');

      const currentId = 'vid_current';
      const candidates = [
        { id: 'vid_current' },
        { id: 'vid_1' },
        { id: 'vid_2' }
      ];

      const filtered = filterRecommendations(candidates, [], currentId);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(v => v.id !== currentId)).toBe(true);
    });

    it('should respect user privacy settings', () => {
      const { filterRecommendations } = require('@/lib/video-playback/recommendation');

      const candidates = [
        { id: 'vid_1', privacy: 'public' },
        { id: 'vid_2', privacy: 'private' },
        { id: 'vid_3', privacy: 'unlisted' },
        { id: 'vid_4', privacy: 'public' }
      ];

      const filtered = filterRecommendations(candidates, [], null, 'public_only');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(v => v.privacy === 'public')).toBe(true);
    });
  });

  describe('Score Normalization', () => {
    it('should return scores between 0 and 1', () => {
      const current = { category: 'education', tags: ['test'], views: 1000, created_at: new Date() };

      const testVideos = [
        { category: 'education', tags: ['test'], views: 1000000, created_at: new Date() },
        { category: 'gaming', tags: [], views: 10, created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        { category: 'education', tags: [], views: 500, created_at: new Date() }
      ];

      testVideos.forEach(video => {
        const score = calculateRecommendationScore(current, video, []);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance', () => {
    it('should calculate scores efficiently for many videos', () => {
      const current = { category: 'education', tags: ['test'], views: 1000, created_at: new Date() };

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        id: `vid_${i}`,
        category: i % 2 === 0 ? 'education' : 'gaming',
        tags: [`tag${i}`],
        views: Math.random() * 100000,
        created_at: new Date()
      }));

      const startTime = Date.now();

      candidates.forEach(video => {
        calculateRecommendationScore(current, video, []);
      });

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 100ms for 100 videos)
      expect(duration).toBeLessThan(100);
    });
  });
});
