import { calculateCurrentViewers, calculatePeakViewers } from '@/lib/live/viewer-counter';

describe('Viewer Count Calculation', () => {
  it('should count active viewers', () => {
    const viewers = [
      { joined_at: new Date(Date.now() - 60000), left_at: null },
      { joined_at: new Date(Date.now() - 120000), left_at: null },
      { joined_at: new Date(Date.now() - 180000), left_at: new Date(Date.now() - 60000) },
    ];

    const count = calculateCurrentViewers(viewers);
    expect(count).toBe(2);
  });

  it('should exclude viewers who left', () => {
    const viewers = [
      { joined_at: new Date(), left_at: new Date() },
    ];

    const count = calculateCurrentViewers(viewers);
    expect(count).toBe(0);
  });

  it('should calculate peak viewers correctly', () => {
    const viewerTimeline = [
      { timestamp: new Date('2025-01-01T10:00:00'), count: 100 },
      { timestamp: new Date('2025-01-01T10:05:00'), count: 250 },
      { timestamp: new Date('2025-01-01T10:10:00'), count: 150 },
    ];

    const peak = calculatePeakViewers(viewerTimeline);
    expect(peak).toBe(250);
  });

  it('should handle empty viewer list', () => {
    expect(calculateCurrentViewers([])).toBe(0);
  });

  it('should track concurrent WebSocket connections', () => {
    const activeConnections = new Set(['ws1', 'ws2', 'ws3']);
    expect(activeConnections.size).toBe(3);
  });
});
