CREATE TABLE IF NOT EXISTS migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredient_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  cost_basis_type TEXT NOT NULL DEFAULT 'none',
  cost_total REAL,
  amount_purchased REAL,
  amount_unit TEXT,
  unit_cost REAL,
  unit_cost_unit TEXT,
  density_g_per_ml REAL,
  density_source TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredient_active_profiles (
  id TEXT PRIMARY KEY,
  ingredient_product_id TEXT NOT NULL,
  compound TEXT NOT NULL,
  concentration_type TEXT NOT NULL,
  value REAL NOT NULL,
  profile_source TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (ingredient_product_id) REFERENCES ingredient_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT,
  bottle_volume_ml REAL NOT NULL DEFAULT 30,
  dose_volume_ml REAL NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_targets (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  compound TEXT NOT NULL,
  target_mg_per_dose REAL NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recipe_ingredient_lines (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  ingredient_product_id TEXT NOT NULL,
  amount REAL NOT NULL,
  amount_unit TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_product_id) REFERENCES ingredient_products(id)
);

