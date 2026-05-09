import { search, SafeSearchType } from 'duck-duck-scrape';
import { embeddingService } from '~/services/embedding.service';
import Resource from '~/models/schemas/Resource.schema';
import { databaseMongoClient } from '~/services/database.services';

// Cache tìm kiếm — tránh search lại cùng query trong 24h
const searchCache = new Map<string, { results: any[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

// Domain uy tín cho tài nguyên học tập
const TRUSTED_DOMAINS = [
  'youtube.com', 'youtu.be',
  'udemy.com', 'coursera.org', 'edx.org', 'pluralsight.com',
  'docs.', 'developer.', 'learn.',
  'freecodecamp.org', 'w3schools.com', 'mdn.',
  'github.com', 'dev.to', 'medium.com',
  'roadmap.sh',
];

class ToolService {

  /**
   * Tìm kiếm Web — Nâng cấp: filter domain uy tín + caching
   */
  public searchWeb = async (query: string) => {
    try {
      // Kiểm tra cache
      const cacheKey = query.toLowerCase().trim();
      const cached = searchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Agent] Cache hit cho query: "${query}"`);
        return cached.results;
      }

      console.log(`[Agent] Đang tìm kiếm Web: "${query}"...`);
      
      const searchResults = await search(query, { safeSearch: SafeSearchType.MODERATE });
      
      // Lọc và ưu tiên domain uy tín
      const allResults = searchResults.results.map(res => ({
        title: res.title,
        url: res.url,
        description: res.description
      }));

      // Ưu tiên: trusted domains trước, sau đó mới đến kết quả khác
      const trustedResults = allResults.filter(r => 
        TRUSTED_DOMAINS.some(d => r.url.includes(d))
      );
      const otherResults = allResults.filter(r => 
        !TRUSTED_DOMAINS.some(d => r.url.includes(d))
      );

      const topResults = [...trustedResults, ...otherResults].slice(0, 5);

      // Self-Populating RAG: Nạp kết quả tìm kiếm vào DB
      for (const item of topResults) {
        const isTrusted = TRUSTED_DOMAINS.some(d => item.url.includes(d));
        if (isTrusted) {
          try {
            const existing = await databaseMongoClient.resources.findOne({ url: item.url });
            if (!existing) {
              const vector = await embeddingService.generateEmbedding(`${item.title} - ${item.description}`);
              const newResource = new Resource({
                title: item.title,
                url: item.url,
                description: item.description,
                type: this.detectType(item.url),
                tags: query.split(' ').filter(w => w.length > 2),
                embedding: vector
              });
              await databaseMongoClient.resources.insertOne(newResource);
              console.log(`🤖 [RAG] Tự học: "${item.title}" → DB`);
            }
          } catch {
            // Im lặng nếu lỗi embedding / rate limit
          }
        }
      }

      // Lưu cache
      searchCache.set(cacheKey, { results: topResults, timestamp: Date.now() });

      return topResults;
    } catch (err) {
      console.error('[Agent] Lỗi tìm kiếm Web:', err);
      return [];
    }
  }

  /**
   * Tự động nhận diện type resource từ URL
   */
  private detectType(url: string): string {
    if (url.includes('youtube') || url.includes('youtu.be')) return 'video';
    if (url.includes('udemy') || url.includes('coursera') || url.includes('edx')) return 'course';
    if (url.includes('github.com')) return 'opensource';
    if (url.includes('docs') || url.includes('developer.')) return 'official';
    return 'article';
  }
}

export const toolService = new ToolService();
