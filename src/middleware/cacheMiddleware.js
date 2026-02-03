/**
 * Simple in-memory cache for GET responses.
 *
 * - Keyed by HTTP method + full URL (including query params)
 * - TTL-based expiration
 * - Cleared on write operations via invalidateCache
 *
 * This is intentionally lightweight and safe for read-heavy, mostly-static
 * endpoints such as catalog listing and product detail pages.
 */

const cacheStore = new Map();

function buildCacheKey(req) {
  return `${req.method}:${req.originalUrl}`;
}

/**
 * Cache middleware for GET endpoints.
 *
 * @param {number} ttlSeconds - time to live in seconds
 */
function cacheMiddleware(ttlSeconds = 30) {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = buildCacheKey(req);
    const now = Date.now();
    const cached = cacheStore.get(key);

    if (cached && cached.expiresAt > now) {
      return res.json(cached.payload);
    }

    // Monkey-patch res.json to capture the payload for caching
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      cacheStore.set(key, {
        payload: body,
        expiresAt: now + ttlSeconds * 1000,
      });

      return originalJson(body);
    };

    return next();
  };
}

/**
 * Clear the entire cache.
 *
 * For simplicity and safety in this exercise we invalidate all keys
 * whenever product data is mutated. This avoids stale catalog results
 * without the complexity of fine-grained cache key management.
 */
function invalidateCache() {
  cacheStore.clear();
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
};
