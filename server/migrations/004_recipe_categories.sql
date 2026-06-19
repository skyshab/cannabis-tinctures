CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO app_settings (key, value, updated_at)
VALUES (
  'recipe_categories',
  '["focus","relaxation","sleep","thc_relaxation","custom"]',
  '2026-06-18T00:00:00.000Z'
);
