
// simple redis client wrapper
import Redis from 'ioredis';
require('dotenv').config();

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT || 6379;

const redis = new Redis({
  host,
  port
});

module.exports = redis;
