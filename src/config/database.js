const { Pool } = require('pg');
const knex = require('knex');
const knexfile = require('../../knexfile');

// PostgreSQL connection pool
const pgPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Knex instance with connection pool
const db = knex({
  ...knexfile[process.env.NODE_ENV || 'development'],
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn, done) => {
      conn.query('SET timezone="UTC";', (err) => {
        done(err, conn);
      });
    },
  },
});

pgPool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pgPool.on('connect', (client) => {
  console.log('New client connected to PostgreSQL pool');
});

module.exports = {
  pgPool,
  db
}; 