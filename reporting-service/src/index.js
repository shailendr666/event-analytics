// reporting-service/src/index.js
require('dotenv').config();
const express = require('express');
const db = require('./db');

const PORT = process.env.PORT || 3001;
const app = express();

app.get('/stats', async (req, res) => {
  const site_id = req.query.site_id;
  const dateParam = req.query.date;

  if (!site_id) return res.status(400).json({ error: 'site_id required' });

  let day;
  if (dateParam) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    day = dateParam;
  } else {
    // default to UTC today
    day = new Date().toISOString().slice(0, 10);
  }

  try {
    const aggRes = await db.query(
      `SELECT total_views FROM daily_aggregates WHERE site_id=$1 AND day=$2`,
      [site_id, day]
    );
    const uniqueRes = await db.query(
      `SELECT COUNT(*) AS unique_users FROM daily_unique_users WHERE site_id=$1 AND day=$2`,
      [site_id, day]
    );
    const pathsRes = await db.query(
      `SELECT path, views FROM daily_path_views WHERE site_id=$1 AND day=$2 ORDER BY views DESC LIMIT 10`,
      [site_id, day]
    );

    const total_views = aggRes.rows.length ? parseInt(aggRes.rows[0].total_views, 10) : 0;
    const unique_users = uniqueRes.rows.length ? parseInt(uniqueRes.rows[0].unique_users, 10) : 0;
    const top_paths = pathsRes.rows.map(r => ({ path: r.path, views: parseInt(r.views, 10) }));

    return res.json({ site_id, date: day, total_views, unique_users, top_paths });
  } catch (err) {
    console.error('Reporting DB error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Reporting service listening on ${PORT}`);
});
