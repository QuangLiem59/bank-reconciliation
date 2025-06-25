export const THROTTLE_LIMITS = {
  SHORT: {
    name: 'SHORT',
    ttl: 1000, // 1 second
    limit: 30,
  },
  MEDIUM: {
    name: 'MEDIUM',
    ttl: 10000, // 10 seconds
    limit: 120,
  },
  LONG: {
    name: 'LONG',
    ttl: 60000, // 1 minute
    limit: 600,
  },
  STRICT: {
    name: 'STRICT',
    ttl: 60000,
    limit: 3,
  },
} as const;
