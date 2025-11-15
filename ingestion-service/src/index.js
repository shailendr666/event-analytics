
// ingestion-service/src/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Joi = require('joi');
const redis = require('./redisClient');

const REDIS_STREAM_NAME = process.env.REDIS_STREAM_NAME || 'events-stream';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

const schema = Joi.object({
  site_id: Joi.string().required(),
  event_type: Joi.string().required(),
  path: Joi.string().required(),
  user_id: Joi.string().allow(null, ''),
  timestamp: Joi.string().isoDate().required()
});

app.post('/event', async (req, res) => {
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details.map(d => d.message) });

  try {
    const id = await redis.xadd(
      REDIS_STREAM_NAME,
      '*',
      'site_id', value.site_id,
      'event_type', value.event_type,
      'path', value.path,
      'user_id', value.user_id || '',
      'timestamp', value.timestamp
    );
    return res.status(200).json({ success: true, queued_id: id });
  } catch (err) {
    console.error('Redis XADD error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Ingestion service listening on ${PORT}`);
});
