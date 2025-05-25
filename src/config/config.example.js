module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'your_database_name',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'your_redis_host',
    port: process.env.REDIS_PORT || 6379
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '24h'
  },
  
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60000,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100
  },
  
  websocket: {
    heartbeatInterval: process.env.WS_HEARTBEAT_INTERVAL || 30000,
    clientTimeout: process.env.WS_CLIENT_TIMEOUT || 120000
  }
}; 