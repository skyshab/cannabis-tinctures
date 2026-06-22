UPDATE ingredient_products
SET notes = 'Cannilabs order: 20g CBD isolate. Item cost $60 plus $3.87 proportional shipping share. COA: CBD 94.264%, total cannabinoids 94.807%, THC not detected.'
WHERE id = '11111111-1111-4111-8111-111111111111';

UPDATE ingredient_products
SET notes = 'Cannilabs order: 10g CBG isolate. Item cost $40 plus $2.58 proportional shipping share. COA: total cannabinoids 95.20%, THC 0.042%, CBD 0.040%; modeled CBG as remaining 95.118%.'
WHERE id = '22222222-2222-4222-8222-222222222222';

UPDATE ingredient_products
SET notes = 'Cannilabs order: 10g CBN isolate. Item cost $55 plus $3.55 proportional shipping share. COA: total cannabinoids 96.14%, THC not detected, CBD not detected.'
WHERE id = '33333333-3333-4333-8333-333333333333';

UPDATE ingredient_active_profiles
SET
  value = 0.94264,
  profile_source = 'coa',
  notes = 'COA: CBD 94.264%; total cannabinoids 94.807%; THC not detected.'
WHERE id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

UPDATE ingredient_active_profiles
SET
  value = 0.95118,
  profile_source = 'coa',
  notes = 'COA: total cannabinoids 95.20%; THC 0.042%; CBD 0.040%; CBG modeled as remaining cannabinoids.'
WHERE id = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa';

INSERT OR IGNORE INTO ingredient_active_profiles (
  id, ingredient_product_id, compound, concentration_type, value, profile_source, notes
) VALUES
(
  'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
  '22222222-2222-4222-8222-222222222222',
  'THC',
  'percent_by_mass',
  0.00042,
  'coa',
  'COA: THC 0.042%.'
),
(
  'cccccccc-2222-4222-8222-cccccccccccc',
  '22222222-2222-4222-8222-222222222222',
  'CBD',
  'percent_by_mass',
  0.00040,
  'coa',
  'COA: CBD 0.040%.'
);

UPDATE ingredient_active_profiles
SET
  value = 0.9614,
  profile_source = 'coa',
  notes = 'COA: total cannabinoids 96.14%; THC not detected; CBD not detected.'
WHERE id = 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa';
