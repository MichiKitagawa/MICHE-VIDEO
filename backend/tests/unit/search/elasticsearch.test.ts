import { buildElasticsearchQuery } from '@/lib/search/elasticsearch';

describe('Elasticsearch Query Builder', () => {
  it('should build basic search query', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video'
    });

    expect(query.query.bool.must).toContainEqual({
      multi_match: {
        query: 'プログラミング',
        fields: ['title^3', 'description', 'tags^2']
      }
    });
    expect(query.query.bool.filter).toContainEqual({
      term: { content_type: 'video' }
    });
  });

  it('should add category filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      category: 'education'
    });

    expect(query.query.bool.filter).toContainEqual({
      term: { category: 'education' }
    });
  });

  it('should add upload date filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      upload_date: 'week'
    });

    expect(query.query.bool.filter).toContainEqual({
      range: {
        created_at: {
          gte: expect.any(String)
        }
      }
    });
  });

  it('should add duration filter', () => {
    const query = buildElasticsearchQuery({
      q: 'プログラミング',
      type: 'video',
      duration: 'medium'
    });

    expect(query.query.bool.filter).toContainEqual({
      range: {
        duration: {
          gte: 240,
          lte: 1200
        }
      }
    });
  });
});
