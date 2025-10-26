import { calculateRecommendationScore } from '@/lib/recommendation/scoring';

describe('Recommendation Score Calculation', () => {
  it('should calculate score based on watch history', () => {
    const userProfile = {
      watchedCategories: ['education', 'technology'],
      watchedTags: ['プログラミング', 'JavaScript'],
      followedChannels: ['ch_123', 'ch_456']
    };

    const video = {
      category: 'education',
      tags: ['プログラミング', 'TypeScript'],
      channel_id: 'ch_789'
    };

    const score = calculateRecommendationScore(video, userProfile);

    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('should prioritize followed channels', () => {
    const userProfile = {
      watchedCategories: ['education'],
      watchedTags: [],
      followedChannels: ['ch_123']
    };

    const videoFromFollowed = {
      category: 'education',
      tags: [],
      channel_id: 'ch_123'
    };

    const videoFromUnfollowed = {
      category: 'education',
      tags: [],
      channel_id: 'ch_999'
    };

    const scoreFollowed = calculateRecommendationScore(videoFromFollowed, userProfile);
    const scoreUnfollowed = calculateRecommendationScore(videoFromUnfollowed, userProfile);

    expect(scoreFollowed).toBeGreaterThan(scoreUnfollowed);
  });

  it('should calculate trending boost', () => {
    const userProfile = {
      watchedCategories: [],
      watchedTags: [],
      followedChannels: []
    };

    const trendingVideo = {
      category: 'entertainment',
      tags: [],
      channel_id: 'ch_999',
      trending_score: 0.95,
      views_24h: 100000
    };

    const score = calculateRecommendationScore(trendingVideo, userProfile);

    expect(score).toBeGreaterThan(0.3);
  });
});
