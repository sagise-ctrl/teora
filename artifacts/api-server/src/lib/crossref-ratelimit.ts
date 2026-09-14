/**
 * CrossRef Rate Limiter
 *
 * Enforces CrossRef API rate limits using a simple in-memory request queue with
 * delay between requests.
 *
 * CrossRef polite pool (used by Teora via mailto):
 *   - 5 requests/sec (200ms between requests)
 *
 * CrossRef authenticated (with API key):
 *   - 10 requests/sec (100ms between requests)
 *
 * This module is process-global — shared across all serverless instances on the
 * same process. For true distributed rate limiting, use Redis.
 */

const CROSSREF_ANON_MS = 200;   // 5 req/sec (anonymous / polite pool)
const CROSSREF_AUTH_MS = 100;   // 10 req/sec (with API key)

let _lastRequest = 0;
const _queue: Array<{
  resolve: () => void;
  timestamp: number;
}> = [];
let _processing = false;

function getDelay(): number {
  // If a CrossRef API key is available, use the faster authenticated limit.
  // Otherwise fall back to the polite pool limit.
  const hasApiKey = !!process.env.CROSSREF_API_KEY;
  return hasApiKey ? CROSSREF_AUTH_MS : CROSSREF_ANON_MS;
}

/**
 * Acquires the rate limit slot, waiting if necessary.
 * Returns after enough time has passed since the last request.
 */
async function acquire(): Promise<void> {
  const delay = getDelay();
  const now = Date.now();
  const elapsed = now - _lastRequest;

  if (elapsed >= delay) {
    // Slot is available immediately
    _lastRequest = now;
    return;
  }

  // Wait for the remaining delay
  return new Promise<void>((resolve) => {
    _queue.push({ resolve, timestamp: now + delay });
    // Only start the timer if this is the first item in the queue
    if (_queue.length === 1) {
      setTimeout(() => processQueue, delay);
    }
  });
}

function processQueue(): void {
  if (_queue.length === 0) {
    _processing = false;
    return;
  }
  _processing = true;
  const now = Date.now();
  const delay = getDelay();
  const next = _queue[0];
  const waitTime = next.timestamp - now;

  if (waitTime <= 0) {
    // It's time to process this request
    _queue.shift();
    _lastRequest = Date.now();
    next.resolve();
    // Process next immediately if queue still has items
    if (_queue.length > 0) {
      setTimeout(processQueue, 0);
    } else {
      _processing = false;
    }
  } else {
    // Wait until the next item's timestamp
    setTimeout(processQueue, waitTime);
  }
}

/**
 * Wraps an async CrossRef API call with rate limiting.
 * Multiple concurrent callers will be queued and spaced apart.
 *
 * @example
 *   const result = await withCrossRefRateLimit(() => fetch(url, options));
 */
export async function withCrossRefRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  return fn();
}
