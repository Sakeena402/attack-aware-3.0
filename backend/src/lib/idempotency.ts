// backend/src/lib/idempotency.ts
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => console.error('[REDIS] Client error:', err));
    await redisClient.connect();
  }
  return redisClient;
}

export interface IdempotencyResult {
  acquired: boolean;
  alreadyProcessed: boolean;
}

/**
 * Attempt to claim an idempotency key.
 *
 * Returns:
 *   acquired=true, alreadyProcessed=false  → first time, proceed
 *   acquired=false, alreadyProcessed=true  → already done, skip
 *   throws                                 → Redis unavailable
 *
 * TTL of 48h covers: retry windows, delayed delivery, clock skew.
 * We do NOT fall through to DB if Redis is down — we fail the request.
 * Reason: falling through silently re-enables the race condition we are
 * trying to prevent. Better to return 503 and let the client retry
 * (which will hit the same Redis check once it recovers) than to
 * silently double-process.
 */
export async function claimIdempotencyKey(
  key: string,
  ttlSeconds: number = 172800 // 48 hours
): Promise<IdempotencyResult> {
  const redis = await getRedis();

  // SET key "1" NX EX ttl — atomic, returns "OK" or null
  const result = await redis.set(key, '1', { NX: true, EX: ttlSeconds });

  if (result === 'OK') {
    return { acquired: true, alreadyProcessed: false };
  }

  // Key exists — already processed
  return { acquired: false, alreadyProcessed: true };
}

/**
 * Mark an idempotency key as "processing" with a short TTL.
 * If the process crashes, the key expires and the next attempt can proceed.
 * Once processing completes, extend the TTL to the full window.
 *
 * This is the "in-flight" lock pattern:
 *   PHASE 1: SET key "processing" NX EX 30  (short — crash recovery window)
 *   PHASE 2: After success → SET key "done" XX EX 172800  (long — dedup window)
 *
 * This prevents:
 *   - Duplicate processing when Redis key survives but process crashed
 *   - Permanent lock if worker crashes before completing
 */
export async function claimWithCrashRecovery(key: string): Promise<{
  acquired: boolean;
  alreadyDone: boolean;
}> {
  const redis = await getRedis();

  // Check if already permanently done
  const existing = await redis.get(key);
  if (existing === 'done') {
    return { acquired: false, alreadyDone: true };
  }

  // existing === 'processing' means a previous worker is in-flight or crashed
  // The short TTL (30s) handles crash recovery — we wait it out or steal after expiry
  if (existing === 'processing') {
    return { acquired: false, alreadyDone: false };
  }

  // Claim with short TTL
  const result = await redis.set(key, 'processing', { NX: true, EX: 30 });
  return { acquired: result === 'OK', alreadyDone: false };
}

export async function markIdempotencyDone(key: string): Promise<void> {
  const redis = await getRedis();
  // XX = only set if key exists (we must own it)
  await redis.set(key, 'done', { XX: true, EX: 172800 });
}