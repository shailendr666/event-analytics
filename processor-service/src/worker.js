// processor-service/src/worker.js
require('dotenv').config();
const Redis = require('ioredis');
const db = require('./db');

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const STREAM = process.env.REDIS_STREAM_NAME || 'events-stream';
const GROUP = process.env.REDIS_CONSUMER_GROUP || 'events-group';
const CONSUMER = process.env.REDIS_CONSUMER_NAME || 'worker-1';
const READ_COUNT = 10;
const BLOCK_MS = 5000;

const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

async function ensureGroup() {
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
    console.log('Consumer group created');
  } catch (err) {
    if (err.message && err.message.includes('BUSYGROUP')) {
      // group exists
    } else {
      console.error('xgroup error', err);
    }
  }
}

function fieldsToObj(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

async function processSingle(id, fields) {
  const msg = fieldsToObj(fields);
  const site_id = msg.site_id;
  const event_type = msg.event_type;
  const path = msg.path;
  const user_id = msg.user_id || null;
  const timestamp = msg.timestamp;
  const ts = new Date(timestamp);
  if (isNaN(ts.getTime())) {
    console.warn('Invalid timestamp for message', id);
    return;
  }
  const day = ts.toISOString().slice(0, 10);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO events(site_id, event_type, path, user_id, ts) VALUES($1,$2,$3,$4,$5)`,
      [site_id, event_type, path, user_id, ts.toISOString()]
    );

    await client.query(
      `INSERT INTO daily_aggregates(site_id, day, total_views)
       VALUES($1, $2, 1)
       ON CONFLICT (site_id, day)
       DO UPDATE SET total_views = daily_aggregates.total_views + 1`,
      [site_id, day]
    );

    await client.query(
      `INSERT INTO daily_path_views(site_id, day, path, views)
       VALUES($1, $2, $3, 1)
       ON CONFLICT (site_id, day, path)
       DO UPDATE SET views = daily_path_views.views + 1`,
      [site_id, day, path]
    );

    if (user_id) {
      await client.query(
        `INSERT INTO daily_unique_users(site_id, day, user_id)
         VALUES($1, $2, $3)
         ON CONFLICT (site_id, day, user_id) DO NOTHING`,
        [site_id, day, user_id]
      );
    }

    await client.query('COMMIT');
    // acknowledge
    await redis.xack(STREAM, GROUP, id);
    // optional xdel to free stream space
    // await redis.xdel(STREAM, id);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('DB error processing message', id, err);
    // do not ack so it can be retried
  } finally {
    client.release();
  }
}

async function main() {
  await ensureGroup();
  console.log('Processor started, waiting for messages...');

  while (true) {
    try {
      const res = await redis.xreadgroup(
        'GROUP', GROUP, CONSUMER,
        'COUNT', READ_COUNT,
        'BLOCK', BLOCK_MS,
        'STREAMS', STREAM, '>'
      );

      if (!res) {
        continue;
      }

      for (const [, messages] of res) {
        for (const [id, fields] of messages) {
          try {
            await processSingle(id, fields);
          } catch (err) {
            console.error('Error processing message', id, err);
          }
        }
      }
    } catch (err) {
      console.error('Worker loop error', err);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

main().catch(err => {
  console.error('Fatal worker error', err);
  process.exit(1);
});
