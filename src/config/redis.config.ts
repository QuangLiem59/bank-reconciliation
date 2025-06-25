import { CacheModule, CacheStore } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const RedisCacheModule = CacheModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  isGlobal: true,
  useFactory: async (configService: ConfigService) => {
    try {
      const store = await redisStore({
        // username: configService.get('REDIS_USERNAME'),
        // password: configService.get('REDIS_PASSWORD'),
        socket: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: parseInt(configService.get('REDIS_PORT'), 10) || 6379,
        },
        ttl: 5 * 60 * 1000,
      });

      const redisClient = store.client;

      redisClient.on('connect', () => {
        console.log('✅ Successfully connected to Redis server');
      });

      redisClient.on('ready', () => {
        console.log('🚀 Redis server is ready to accept commands');
      });

      redisClient.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });

      redisClient.on('reconnecting', () => {
        console.log('🔁 Attempting to reconnect to Redis...');
      });

      redisClient.on('end', () => {
        console.log('🚪 Connection to Redis closed');
      });

      return {
        store: store as unknown as CacheStore,
      };
    } catch (error) {
      console.error('🔥 Failed to initialize Redis cache:', error);
      throw error;
    }
  },
});
