import { calculateAnalytics } from '@/lib/analytics/calculations';

describe('Analytics Calculations', () => {
  it('should calculate total views correctly', () => {
    const videos = [
      { views: 1000, watch_time: 5000, likes: 100 },
      { views: 2000, watch_time: 8000, likes: 200 },
      { views: 1500, watch_time: 6000, likes: 150 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.total_views).toBe(4500);
    expect(analytics.total_watch_time).toBe(19000);
    expect(analytics.total_likes).toBe(450);
  });

  it('should calculate average view duration', () => {
    const videos = [
      { views: 100, watch_time: 30000, duration: 60000 },
      { views: 200, watch_time: 80000, duration: 120000 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.avg_view_duration).toBeCloseTo(366.67, 2);
  });

  it('should calculate engagement metrics', () => {
    const videos = [
      { views: 1000, likes: 100, comments: 50, shares: 25 }
    ];

    const analytics = calculateAnalytics(videos);

    expect(analytics.like_rate).toBe(0.10);
    expect(analytics.comment_rate).toBe(0.05);
  });
});
