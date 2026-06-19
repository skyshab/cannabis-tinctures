UPDATE app_settings
SET
  value = '{"title":"Tinctura","tagline":"Local recipe planning."}',
  updated_at = '2026-06-19T00:00:00.000Z'
WHERE key = 'app_branding'
  AND value = '{"title":"Cannabis Tinctures","tagline":"Local recipe planning."}';
