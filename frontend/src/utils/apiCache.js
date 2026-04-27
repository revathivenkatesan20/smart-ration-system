/**
 * Global API Cache — Smart Ration System
 * 
 * Prevents every page from re-fetching the same data from Render.
 * Data is cached in memory for the entire user session.
 * Cache expires after `TTL_MS` to allow refreshes.
 */

const cache = {};
const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * A drop-in replacement for fetch() that caches responses.
 * Non-GET requests (POST, PUT, DELETE) bypass the cache entirely
 * and also clear any cached GET for the same base URL.
 */
export const cachedFetch = async (url, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();

  // Non-GET: bypass cache, but invalidate related GET cache
  if (method !== 'GET') {
    // Invalidate anything that starts with the same base path
    const baseKey = url.split('?')[0];
    Object.keys(cache).forEach(k => {
      if (k.includes(baseKey.split('/').slice(0, -1).join('/'))) {
        delete cache[k];
      }
    });
    const res = await fetch(url, options);
    return res;
  }

  // GET: check cache first
  const now = Date.now();
  if (cache[url] && now - cache[url].timestamp < TTL_MS) {
    // Return a mock Response with cached data
    return {
      ok: true,
      status: 200,
      json: async () => cache[url].data,
    };
  }

  // Fetch from server and store in cache
  const res = await fetch(url, options);
  if (res.ok) {
    const data = await res.json();
    cache[url] = { data, timestamp: now };
    return {
      ok: true,
      status: 200,
      json: async () => data,
    };
  }

  return res;
};

/**
 * Manually invalidate a specific URL from cache.
 * Call this after a mutation (e.g. after updating stock).
 */
export const invalidateCache = (urlPattern) => {
  Object.keys(cache).forEach(k => {
    if (k.includes(urlPattern)) delete cache[k];
  });
};

/**
 * Clear the entire cache (e.g., on logout).
 */
export const clearCache = () => {
  Object.keys(cache).forEach(k => delete cache[k]);
};
