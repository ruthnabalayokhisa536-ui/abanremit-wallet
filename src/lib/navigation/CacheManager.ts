import type { ICacheManager } from './interfaces';
import type { CacheEntry, CacheStrategy } from './types';
import { CACHE_MAX_SIZE_BYTES, DEFAULT_CACHE_TTL_MS } from './constants';

export class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private strategies: Map<string, CacheStrategy> = new Map();

  set(key: string, value: any, ttl: number = DEFAULT_CACHE_TTL_MS): void {
    const now = Date.now();
    const size = this.estimateSize(value);
    
    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      ttl,
      size,
      accessCount: 0,
      lastAccessed: now,
      strategy: this.strategies.get(key) || 'cache-first',
    };

    this.cache.set(key, entry);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.strategies.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.strategies.clear();
  }

  getSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  evictLRU(targetSize: number): void {
    const currentSize = this.getSize();
    
    if (currentSize <= targetSize) {
      return;
    }

    // Sort entries by lastAccessed (oldest first)
    const entries = Array.from(this.cache.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    let sizeToFree = currentSize - targetSize;
    
    for (const entry of entries) {
      if (sizeToFree <= 0) {
        break;
      }

      // Preserve priority metadata before deletion
      const priority = this.extractPriority(entry.key);
      
      this.cache.delete(entry.key);
      sizeToFree -= entry.size;

      // Store priority metadata for future visits
      if (priority) {
        this.storePriorityMetadata(entry.key, priority);
      }
    }
  }

  setStrategy(key: string, strategy: CacheStrategy): void {
    this.strategies.set(key, strategy);
    
    // Update existing entry if present
    const entry = this.cache.get(key);
    if (entry) {
      entry.strategy = strategy;
    }
  }

  getStrategy(key: string): CacheStrategy {
    return this.strategies.get(key) || 'cache-first';
  }

  // Helper methods
  private estimateSize(value: any): number {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default 1KB if can't stringify
    }
  }

  private extractPriority(key: string): string | null {
    // Extract priority from key if it follows pattern: "route:path:priority"
    const parts = key.split(':');
    if (parts.length >= 3) {
      return parts[parts.length - 1];
    }
    return null;
  }

  private storePriorityMetadata(key: string, priority: string): void {
    // Store in a separate metadata cache (simplified for now)
    const metadataKey = `metadata:${key}`;
    this.strategies.set(metadataKey, 'cache-only');
  }

  // Check if cache size exceeds limit
  shouldEvict(): boolean {
    return this.getSize() > CACHE_MAX_SIZE_BYTES;
  }

  // Get all entries (for testing/debugging)
  getAllEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }
}
