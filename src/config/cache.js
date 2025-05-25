const Redis = require('ioredis');

const createRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
};

// Create separate connections for different purposes
const redis = createRedisClient(); // For regular operations
const subscriber = createRedisClient(); // For subscriptions
const publisher = createRedisClient(); // For publishing

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

subscriber.on('error', (err) => {
  console.error('Redis Subscriber Error:', err);
});

publisher.on('error', (err) => {
  console.error('Redis Publisher Error:', err);
});

module.exports = {
  redis,
  subscriber,
  publisher
}; 