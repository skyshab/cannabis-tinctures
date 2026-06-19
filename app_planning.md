# Hemp Tincture App — Planning and Build Instructions

## Purpose

This document gives Codex or another coding agent enough context to begin building the v1 app. The agent should first clarify the v1 technical approach, then implement the domain model and calculation engine before polishing the UI.

## Product summary

Build a local-first web app for designing cannabis tincture recipes.

The app should let the user:

1. Enter ingredient products.
2. Define cannabinoid profiles for those products.
3. Create a 30ml tincture recipe targeting mg per 1ml dose.
4. Select source ingredients.
5. Calculate amounts, costs, deficits, overages, and carrier volume.
6. Save finalized recipes to SQLite.
7. Browse, duplicate, and revise saved recipes.

## Clarify first: v1 technical approach

Before building, ask the user to choose or confirm these decisions:

### 1. App container

Options:

- Local web app with backend server and SQLite.
- Desktop app using Tauri or Electron.
- Browser-only app using SQLite/WASM.

Recommended v1:

- Local web app with lightweight backend and SQLite.

### 2. Frontend

Options:

- React + TypeScript.
- SvelteKit.
- Vue.
- Plain TypeScript.

Recommended v1:

- React + TypeScript if the user wants a mainstream, Codex-friendly approach.
- SvelteKit if the user prefers less boilerplate.

### 3. Backend / data layer

Options:

- Node/Express/Fastify + SQLite.
- SvelteKit server routes + SQLite.
- Tauri backend + SQLite.
- SQLite WASM in browser.

Recommended v1:

- Node/Fastify or SvelteKit server routes with SQLite.
- Use migrations.
- Keep DB access isolated in a repository layer.

### 4. Recipe solver complexity

Options:

- Manual-assist: user selects ingredient amounts, app calculates resulting actives.
- Target solver: user enters targets, app suggests amounts.
- Optimization solver: app chooses best ingredient mix based on targets, cost, inventory, and overage rules.

Recommended v1:

- Implement both manual-assist and simple target solver.
- Avoid full optimization until later.

### 5. Inventory management

Options:

- Reference/costing only.
- Track available quantities.
- Automatically decrement inventory when recipes are saved.

Recommended v1:

- Reference/costing only.
- Add inventory decrementing later.

## V1 feature scope

### Include in v1

- Ingredient product CRUD.
- Multi-compound active profiles for products.
- Recipe creation form.
- Draft recipe state in browser/local app state.
- Explicit Save to SQLite.
- Saved recipe list.
- Recipe detail view.
- Duplicate recipe.
- Cost per bottle and dose.
- Calculation of ingredient contributions, deficits, and overages.
- Basic unit handling for mg, g, ml, percent.
- Ability to mark ingredient potency assumptions.

### Exclude from v1

- User accounts.
- Cloud sync.
- Mobile app packaging.
- Automatic inventory depletion.
- Medical advice or effect promises.
- Complex optimization across many ingredient choices.
- Regulatory compliance automation.
- Ecommerce/order tracking.

## Data model

### Entity: IngredientProduct

Represents a purchased product or usable ingredient.

Suggested fields:

```ts
type IngredientCategory =
  | 'isolate'
  | 'distillate'
  | 'rso'
  | 'terpene_blend'
  | 'carrier_oil'
  | 'solvent'
  | 'other';

interface IngredientProduct {
  id: string;
  name: string;
  category: IngredientCategory;
  source?: string;
  purchaseDate?: string;
  costTotal?: number;
  amountPurchased?: number;
  amountUnit?: 'mg' | 'g' | 'ml' | 'oz';
  densityGPerMl?: number;
  notes?: string;
  isArchived: boolean;
  activeProfile: ActiveProfileEntry[];
  createdAt: string;
  updatedAt: string;
}
```

### Entity: ActiveProfileEntry

Represents an active compound in a product.

```ts
type ActiveCompound =
  | 'CBD'
  | 'CBG'
  | 'CBN'
  | 'CBC'
  | 'THC'
  | 'THCA'
  | 'terpenes'
  | string;

interface ActiveProfileEntry {
  compound: ActiveCompound;
  concentrationType: 'percent_by_mass' | 'mg_per_g' | 'mg_per_ml' | 'percent_by_volume';
  value: number;
  isAssumption: boolean;
  notes?: string;
}
```

### Entity: Recipe

```ts
interface Recipe {
  id: string;
  name: string;
  purpose?: 'focus' | 'relaxation' | 'sleep' | 'thc_relaxation' | 'custom';
  bottleVolumeMl: number;
  doseVolumeMl: number;
  targetActives: RecipeTarget[];
  ingredients: RecipeIngredientLine[];
  carrierIngredientId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Entity: RecipeTarget

```ts
interface RecipeTarget {
  compound: ActiveCompound;
  targetMgPerDose: number;
}
```

### Entity: RecipeIngredientLine

```ts
interface RecipeIngredientLine {
  ingredientProductId: string;
  amount: number;
  amountUnit: 'mg' | 'g' | 'ml';
  locked?: boolean;
  notes?: string;
}
```

### Calculation result types

```ts
interface CompoundContribution {
  compound: ActiveCompound;
  targetMgPerBottle: number;
  actualMgPerBottle: number;
  targetMgPerDose: number;
  actualMgPerDose: number;
  deltaMgPerBottle: number;
  status: 'under' | 'met' | 'over';
}

interface CostBreakdownLine {
  ingredientProductId: string;
  amountUsed: number;
  amountUnit: 'mg' | 'g' | 'ml';
  estimatedCost: number;
}

interface RecipeCalculationResult {
  dosesPerBottle: number;
  contributions: CompoundContribution[];
  costLines: CostBreakdownLine[];
  totalCost: number;
  costPerDose: number;
  estimatedCarrierVolumeMl?: number;
  warnings: string[];
}
```

## SQLite schema draft

```sql
CREATE TABLE ingredient_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  purchase_date TEXT,
  cost_total REAL,
  amount_purchased REAL,
  amount_unit TEXT,
  density_g_per_ml REAL,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE ingredient_active_profiles (
  id TEXT PRIMARY KEY,
  ingredient_product_id TEXT NOT NULL,
  compound TEXT NOT NULL,
  concentration_type TEXT NOT NULL,
  value REAL NOT NULL,
  is_assumption INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (ingredient_product_id) REFERENCES ingredient_products(id)
);

CREATE TABLE recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT,
  bottle_volume_ml REAL NOT NULL DEFAULT 30,
  dose_volume_ml REAL NOT NULL DEFAULT 1,
  carrier_ingredient_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (carrier_ingredient_id) REFERENCES ingredient_products(id)
);

CREATE TABLE recipe_targets (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  compound TEXT NOT NULL,
  target_mg_per_dose REAL NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE recipe_ingredient_lines (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL,
  ingredient_product_id TEXT NOT NULL,
  amount REAL NOT NULL,
  amount_unit TEXT NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  FOREIGN KEY (ingredient_product_id) REFERENCES ingredient_products(id)
);
```

## Calculation engine requirements

The calculation engine should be pure and testable.

Suggested functions:

```ts
function getDosesPerBottle(bottleVolumeMl: number, doseVolumeMl: number): number;

function targetMgPerBottle(targetMgPerDose: number, dosesPerBottle: number): number;

function convertIngredientAmountToReferenceUnits(
  amount: number,
  unit: 'mg' | 'g' | 'ml',
  densityGPerMl?: number
): { mg?: number; g?: number; ml?: number; warnings: string[] };

function calculateContributionForLine(
  line: RecipeIngredientLine,
  product: IngredientProduct
): CompoundContribution[];

function calculateRecipe(
  recipe: Recipe,
  products: IngredientProduct[]
): RecipeCalculationResult;
```

## Solver requirements

For v1, implement a simple helper that can solve straightforward cases.

### Case 1: isolate-only target

If the target compound has one selected isolate and that isolate has known purity:

```text
required ingredient mg = target compound mg / purityDecimal
```

Example:

```text
750mg CBG target / 0.99 = 757.58mg CBG isolate
```

### Case 2: distillate first, isolate fills remainder

If a selected distillate is locked at a chosen amount, calculate its active contributions first. Then calculate the remaining amount needed from isolates.

Example:

```text
CBD target = 2250mg
Distillate contributes 1800mg CBD, 100mg CBG, 50mg CBN
Remaining CBD = 450mg
Remaining CBG target = target CBG - 100mg
Remaining CBN target = target CBN - 50mg
```

### Case 3: RSO THC add-on

If THC target is supplied by 80% RSO:

```text
RSO mg = THC target mg / 0.80
```

The app should allow potency to be edited.

## UI pages

### Dashboard / Home

- Button: New Recipe
- Button: Ingredient Products
- Recent saved recipes
- Quick cost summary cards, optional later

### Ingredient Products page

- Product table
- Add/Edit product modal or page
- Active profile editor that supports multiple compounds
- Archived toggle

### New Recipe page

Sections:

1. Recipe identity
   - Name
   - Purpose
   - Bottle size
   - Dose size
2. Targets
   - Compound rows: CBD, CBG, CBN, THC, etc.
   - mg per dose
3. Ingredients
   - Select products
   - Enter or solve amount
   - Lock amount
4. Results
   - Per-compound target vs actual table
   - Cost per bottle and dose
   - Carrier volume estimate
   - Warnings
5. Actions
   - Save Recipe
   - Duplicate
   - Reset Draft

### Saved Recipes page

- Table of saved recipes
- Search/filter by purpose
- Open detail
- Duplicate

### Recipe Detail page

- Read-only recipe view by default
- Edit button
- Calculation summary
- Ingredient lines
- Notes

## Validation and warnings

The app should warn when:

- A product has no active profile.
- A product profile uses assumptions.
- A calculation needs density but density is missing.
- A recipe exceeds target by more than a configurable tolerance.
- A recipe is under target.
- THC is included.
- Terpenes exceed 1% or a user-defined threshold.
- Bottle volume would be exceeded by ingredient volumes.

## Testing priorities

Write unit tests for:

- Doses per bottle.
- mg per bottle calculation.
- Isolate purity calculations.
- RSO THC calculations.
- Multi-active distillate contributions.
- Cost per mg/ml/g calculations.
- Under/met/over target statuses.
- Missing density warning.

Example test cases:

```ts
// 25mg CBG/dropper in 30ml bottle = 750mg CBG target
expect(targetMgPerBottle(25, 30)).toBe(750);

// 80% RSO for 300mg THC requires 375mg RSO
expect(requiredIngredientMg(300, 0.8)).toBe(375);

// $8/g RSO at 375mg used costs $3
expect(costForMass(0.375, 8)).toBe(3);
```

## Seed data to include

Use the records from `ingredient_details.md` as starter seed data.

Use recipe concepts from `blend_recipes.md` as starter saved recipes or recipe templates.

## Implementation order

1. Confirm v1 stack and architecture.
2. Create project scaffold.
3. Implement unit conversion helpers.
4. Implement calculation engine.
5. Add tests.
6. Create SQLite schema and migration.
7. Add seed ingredient data.
8. Implement ingredient CRUD.
9. Implement recipe draft UI.
10. Implement save/load recipes.
11. Implement saved recipe list and duplicate action.
12. Polish warnings and summary tables.

## Agent instructions

When continuing this project, preserve these priorities:

- Accuracy over UI flourish.
- Explicit assumptions over hidden assumptions.
- Keep mass and volume distinct.
- Let products have multiple active compounds.
- Do not autosave recipe drafts into the database.
- Write saved recipes only after explicit user action.
- Keep the calculation engine pure and well-tested.
- Avoid medical claims.
