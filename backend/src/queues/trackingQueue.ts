// backend/src/queues/trackingQueue.ts



import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();
import Bull from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';


function buildRedisOptions(url: string) {
  const isUpstash = url.startsWith('rediss://');

  if (isUpstash) {
    return {
      redis: {
        tls: {
          rejectUnauthorized: false,  // Required for Upstash
        },
        // Parse the URL manually for ioredis
        ...parseRedisUrl(url),
        maxRetriesPerRequest: null,   // Disable retry limit for Bull
        enableReadyCheck:     false,  // Required for Upstash
        connectTimeout:       10000,
        lazyConnect:          false,
      },
    };
  }

  // Local Redis
  return {
    redis: {
      host:                 'localhost',
      port:                 6379,
      maxRetriesPerRequest: null,
      enableReadyCheck:     false,
    },
  };
}

// Parse rediss://default:PASSWORD@HOST:PORT into parts
function parseRedisUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host:     parsed.hostname,
      port:     parseInt(parsed.port) || 6379,
      username: parsed.username || 'default',
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    console.error('[QUEUE] Failed to parse REDIS_URL:', url);
    return {};
  }
}

const redisOpts = buildRedisOptions(REDIS_URL);

console.log(`[QUEUE] Connecting to Redis:`);

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export const riskQueue = new Bull('risk-recalculation', {
  ...redisOpts,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail:     50,
  },
});

export const campaignCounterQueue = new Bull('campaign-counters', {
  ...redisOpts,
  defaultJobOptions: {
    attempts:         3,
    backoff:          { type: 'fixed', delay: 1000 },
    removeOnComplete: 50,
    removeOnFail:     50,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONNECTION HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
riskQueue.on('error', (err) => {
  console.error('[QUEUE riskQueue] Error:', err.message);
});

campaignCounterQueue.on('error', (err) => {
  console.error('[QUEUE campaignCounterQueue] Error:', err.message);
});

riskQueue.on('ready', () => {
  console.log('[QUEUE] riskQueue connected to Redis ✓');
});

campaignCounterQueue.on('ready', () => {
  console.log('[QUEUE] campaignCounterQueue connected to Redis ✓');
});

// ─────────────────────────────────────────────────────────────────────────────
// JOB TYPES
// ─────────────────────────────────────────────────────────────────────────────
export interface RiskJob {
  userId:     string;
  action:     'click' | 'credentials' | 'report';
  campaignId: string;
}

export interface CampaignCounterJob {
  campaignId: string;
  field:      'clickedCount' | 'reportedCount' | 'deliveredCount' | 'sentCount';
  increment:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENQUEUE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export async function enqueueRiskUpdate(job: RiskJob): Promise<void> {
  await riskQueue.add(job, {
    jobId: `risk-${job.userId}`,  // deduplication: same user = same jobId
  });
}

export async function enqueueCampaignCounter(job: CampaignCounterJob): Promise<void> {
  await campaignCounterQueue.add(job, {
    jobId: `counter-${job.campaignId}-${job.field}-${Date.now()}`,
  });
}