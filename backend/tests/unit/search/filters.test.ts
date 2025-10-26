import { filterAdultContent } from '@/lib/search/filters';

describe('Adult Content Filtering', () => {
  it('should exclude adult content for Free plan', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' },
      { id: 'vid_3', is_adult: false, title: '通常動画2' }
    ];

    const filtered = filterAdultContent(results, 'free');

    expect(filtered).toHaveLength(2);
    expect(filtered.find(v => v.is_adult)).toBeUndefined();
  });

  it('should exclude adult content for Premium plan', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].is_adult).toBe(false);
  });

  it('should include adult content for Premium+ plan with age verification', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium_plus', { isAgeVerified: true });

    expect(filtered).toHaveLength(2);
  });

  it('should exclude adult content for Premium+ plan without age verification', () => {
    const results = [
      { id: 'vid_1', is_adult: false, title: '通常動画' },
      { id: 'vid_2', is_adult: true, title: 'アダルト動画' }
    ];

    const filtered = filterAdultContent(results, 'premium_plus', { isAgeVerified: false });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].is_adult).toBe(false);
  });
});
