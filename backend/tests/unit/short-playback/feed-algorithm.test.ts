import { calculateFeedScore, sortFeedShorts } from '@/lib/shorts/feed-algorithm';

/**
 * Short Feed Algorithm Unit Tests
 *
 * Tests feed scoring and sorting logic
 * Reference: docs/tests/short-playback-tests.md
 */

describe('Short Feed Algorithm', () => {
  describe('Feed Score Calculation', () => {
    it('should prioritize recent and popular shorts', () => {
      const short = {
        created_at: new Date(Date.now() - 3600000), // 1 hour ago
        view_count: 10000,
        like_count: 800,
        comment_count: 50,
        is_followed: false
      };

      const score = calculateFeedScore(short);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should boost shorts from followed creators', () => {
      const shortFromFollowed = {
        created_at: new Date(),
        view_count: 100,
        like_count: 10,
        comment_count: 1,
        is_followed: true
      };

      const shortFromStranger = {
        ...shortFromFollowed,
        is_followed: false
      };

      const scoreFollowed = calculateFeedScore(shortFromFollowed);
      const scoreStranger = calculateFeedScore(shortFromStranger);

      expect(scoreFollowed).toBeGreaterThan(scoreStranger);
    });

    it('should penalize old shorts', () => {
      const recentShort = {
        created_at: new Date(),
        view_count: 1000,
        like_count: 50,
        comment_count: 5,
        is_followed: false
      };

      const oldShort = {
        ...recentShort,
        created_at: new Date(Date.now() - 30 * 24 * 3600000) // 30 days ago
      };

      const scoreRecent = calculateFeedScore(recentShort);
      const scoreOld = calculateFeedScore(oldShort);

      expect(scoreRecent).toBeGreaterThan(scoreOld);
    });

    it('should calculate engagement rate correctly', () => {
      const highEngagement = {
        created_at: new Date(),
        view_count: 1000,
        like_count: 300, // 30%
        comment_count: 50,
        is_followed: false
      };

      const lowEngagement = {
        created_at: new Date(),
        view_count: 1000,
        like_count: 50, // 5%
        comment_count: 5,
        is_followed: false
      };

      expect(calculateFeedScore(highEngagement)).toBeGreaterThan(calculateFeedScore(lowEngagement));
    });
  });

  describe('Feed Sorting', () => {
    it('should sort by score descending', () => {
      const shorts = [
        { id: '1', score: 0.5 },
        { id: '2', score: 0.9 },
        { id: '3', score: 0.3 }
      ];

      const sorted = sortFeedShorts(shorts);

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('3');
    });

    it('should handle diversity injection', () => {
      const shorts = Array(20).fill(null).map((_, i) => ({
        id: `${i}`,
        category: i % 3 === 0 ? 'dance' : 'comedy',
        score: 0.9 - i * 0.01
      }));

      const sorted = sortFeedShorts(shorts, { diversify: true });

      // Check that categories are somewhat mixed
      const firstFive = sorted.slice(0, 5);
      const categories = firstFive.map(s => s.category);
      const uniqueCategories = new Set(categories);

      expect(uniqueCategories.size).toBeGreaterThan(1);
    });
  });
});
