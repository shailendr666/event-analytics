-- migrations/init.sql

CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  user_id TEXT,
  ts TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_site_ts ON events(site_id, ts);

CREATE TABLE IF NOT EXISTS daily_aggregates (
  site_id TEXT NOT NULL,
  day DATE NOT NULL,
  total_views BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day)
);

CREATE TABLE IF NOT EXISTS daily_path_views (
  site_id TEXT NOT NULL,
  day DATE NOT NULL,
  path TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, path)
);

CREATE TABLE IF NOT EXISTS daily_unique_users (
  site_id TEXT NOT NULL,
  day DATE NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (site_id, day, user_id)
);
