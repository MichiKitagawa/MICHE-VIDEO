import { reorderVideos } from '@/lib/playlist/reorder';

describe('Video Reordering Algorithm', () => {
  it('should reorder videos correctly', () => {
    const videoOrders = [
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 1 },
      { video_id: 'vid_789', position: 2 }
    ];

    const result = reorderVideos(videoOrders);

    expect(result).toEqual([
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 1 },
      { video_id: 'vid_789', position: 2 }
    ]);
  });

  it('should handle position gaps', () => {
    const videoOrders = [
      { video_id: 'vid_123', position: 0 },
      { video_id: 'vid_456', position: 5 },
      { video_id: 'vid_789', position: 10 }
    ];

    const result = reorderVideos(videoOrders);

    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(1);
    expect(result[2].position).toBe(2);
  });
});
