import { sortEpisodes } from '@/lib/netflix/sort';

describe('Episode Sorting', () => {
  it('should sort episodes by season and episode number', () => {
    const episodes = [
      { season_number: 2, episode_number: 1, title: 'S2E1' },
      { season_number: 1, episode_number: 2, title: 'S1E2' },
      { season_number: 1, episode_number: 1, title: 'S1E1' },
      { season_number: 2, episode_number: 2, title: 'S2E2' }
    ];

    const sorted = sortEpisodes(episodes);

    expect(sorted[0].title).toBe('S1E1');
    expect(sorted[1].title).toBe('S1E2');
    expect(sorted[2].title).toBe('S2E1');
    expect(sorted[3].title).toBe('S2E2');
  });

  it('should handle non-sequential episode numbers', () => {
    const episodes = [
      { season_number: 1, episode_number: 5, title: 'E5' },
      { season_number: 1, episode_number: 1, title: 'E1' },
      { season_number: 1, episode_number: 3, title: 'E3' }
    ];

    const sorted = sortEpisodes(episodes);

    expect(sorted[0].title).toBe('E1');
    expect(sorted[1].title).toBe('E3');
    expect(sorted[2].title).toBe('E5');
  });
});
