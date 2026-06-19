# Hemp Tincture App v1 Decisions

This document records the v1 decisions made after reviewing the exported project notes.

## App Shape

- Build a local browser app.
- Use a local backend with SQLite, not a browser-only database.
- Use localhost for v1. A custom local domain can be added later.
- During development, the client and server may run separately.
- For normal local use, the Fastify backend should serve the built React app at one URL, likely `http://localhost:3000`.

## Stack

- Frontend: React + TypeScript + Vite.
- Styling: Tailwind CSS with local lightweight components.
- Backend: Node + Fastify.
- API style: REST JSON.
- Database: SQLite.
- SQLite library: `better-sqlite3`.
- Package manager: npm workspaces.
- Node target: Node 22 LTS.
- Tests: Vitest, especially for shared calculation logic.

## Repository Shape

Use a workspace layout:

```text
client/
server/
shared/
data/
docs/
```

- `client`: React/Vite UI.
- `server`: Fastify API, SQLite access, migrations.
- `shared`: domain types, unit helpers, calculation engine, simple solver.
- `data/tinctures.sqlite`: local SQLite database file.

The database file should be ignored by git.

## Migrations and Seed Data

- Use plain SQL migration files.
- Use UUID string IDs.
- Seed initial ingredient and recipe data using SQL migrations.
- Solved recipe seed amounts may be precomputed and inserted directly.

Suggested migration order:

```text
server/migrations/001_initial_schema.sql
server/migrations/002_seed_ingredients.sql
server/migrations/003_seed_recipes.sql
```

## Core Data Behavior

- Ingredients are physical products added to a recipe.
- Compounds are CBD, CBG, CBN, THC, terpenes, and similar active/profile values.
- Ingredient products can contain multiple compounds.
- Recipes use current ingredient data when recalculated.
- Do not snapshot ingredient potency or cost into saved recipes in v1.
- Ingredient records can be archived.
- Recipe records can be deleted.
- Saved recipes are edited directly with an explicit Save action.
- Duplicate is available for variants.
- No inventory tracking in v1.
- No automatic inventory decrementing.

## Costing

- Each ingredient has a single current cost basis.
- Ingredients may use either:
  - total cost plus purchased amount, or
  - direct unit cost, such as `$8/g`.
- The app derives cost per mg, g, or ml from the available cost basis.
- Old isolate bundle costs from earlier notes should not be used for current costing.

## Units and Profiles

- Recipe ingredient amounts support `mg`, `g`, and `ml`.
- Product purchase amounts support `mg`, `g`, and `ml`.
- Active profile concentration types support:
  - `percent_by_mass`
  - `mg_per_g`
  - `mg_per_ml`
  - `percent_by_volume`
- Active profile values include a source/confidence field:
  - `coa`
  - `vendor_label`
  - `estimate`
  - `unknown`
- Calculations only use modeled profile values. Unknown trace compounds stay in notes.

## Density and Volume

- CBD distillate and RSO may have approximate densities seeded up front.
- CBD distillate default density: `1.0 g/ml`, source `estimate`.
- RSO default density: `1.0 g/ml`, source `estimate`, used for volume displacement only.
- Do not freely convert mass and volume without density.
- Isolate displacement is ignored when estimating carrier oil volume.
- Carrier oil fills remaining bottle volume.

Carrier fill calculation should subtract:

```text
bottle volume
- Everclear ml
- distillate ml
- terpene ml
- estimated RSO volume, if density exists
```

Isolate mass does not reduce calculated carrier volume.

## Defaults

- Bottle volume: `30ml`, editable per recipe.
- Dose volume: `1ml`, editable per recipe.
- Everclear: prefilled as `3ml` in every new 30ml recipe, editable per recipe.
- Terpenes: manual ml entry only. No percent helper in v1.
- Mass amounts solved by the app round to nearest `1mg`.
- Liquid amounts display rounded to nearest `0.1ml`.

## Solver

V1 should include manual-assist plus simple target solving.

Supported solver cases:

- Isolate-only targets.
- Locked distillate first, then isolates fill remaining deficits.
- RSO as a THC source using editable potency.

Do not build full optimization in v1.

## UI Decisions

- Main navigation:
  - Recipes
  - Ingredients
  - Settings/About
- Recipes is the default landing page.
- Recipe list uses cards.
- Ingredient list uses cards.
- Recipe editor is a single scrollable page with sections:
  - Basics
  - Target Compounds
  - Ingredients
  - Results
  - Notes
- Settings/About is read-only in v1.
- Include a small general About/Settings note that the app is for personal recipe planning and recordkeeping.
- Do not show THC-specific warnings or save confirmations.

## Seed Ingredients

### Cannilabs Isolates

Pricing extracted from `cannilabs-pricing.png`.

Order totals:

```text
Subtotal: $155.00
Shipping: $10.00
Tax: $0.00
Total: $165.00
```

Shipping is allocated proportionally by item cost.

| Ingredient | Quantity bought | Item cost | Shipping share | Total cost basis | Cost per g | Cost per mg |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| CBD isolate | 20g | $60.00 | $3.87 | $63.87 | $3.19/g | $0.00319/mg |
| CBG isolate | 10g | $40.00 | $2.58 | $42.58 | $4.26/g | $0.00426/mg |
| CBN isolate 98%+ | 10g | $55.00 | $3.55 | $58.55 | $5.85/g | $0.00585/mg |

Seed profiles:

- CBD isolate: CBD `98% by mass`, source `estimate`.
- CBG isolate: CBG `98% by mass`, source `estimate`.
- CBN isolate: CBN `98% by mass`, source `vendor_label`.

### Fern Valley Farms Full-Spectrum CBD Distillate

- Amount: `10ml`.
- Cost: `$65`.
- Density: `1.0 g/ml`, source `estimate`.
- CBD profile: `85% by mass`, source `estimate`.
- Secondary cannabinoids and terpenes are unknown and not modeled until COA data is entered.
- Seed as an available ingredient, but do not use it in starter recipe solved lines.

### Local RSO

- Category: `rso`.
- Cost basis: `$8/g`.
- THC profile: `80% by mass`, source `estimate`.
- Density: `1.0 g/ml`, source `estimate`, for volume displacement only.
- Bought approximately a 62g jar, but inventory is not tracked.
- Notes should say there is no COA and trace cannabinoids/terpenes may be present but are not modeled.
- Measure by weight.

### Everclear

- Category: `solvent`.
- Prefill new recipes with `3ml`.
- Amount is editable per recipe.

### MCT Oil

- Category: `carrier_oil`.
- Used as fill-to-volume carrier.
- Precision is not critical in v1.

## Seed Recipes

Seed initial blend concepts as saved recipes, not templates.

Use isolates by default for CBD, CBG, and CBN solved lines. Use RSO for THC in the THC recipe. Include Everclear `3ml` and calculated MCT fill.

### Focus CBD/CBG

Per 1ml dose:

```text
CBD: 50mg
CBG: 25mg
```

Per 30ml bottle:

```text
CBD: 1500mg
CBG: 750mg
```

Solved with 98% isolates:

```text
CBD isolate: 1531mg
CBG isolate: 765mg
```

### Relaxation CBD/CBG/CBN

Per 1ml dose:

```text
CBD: 75mg
CBG: 10mg
CBN: 5mg
```

Per 30ml bottle:

```text
CBD: 2250mg
CBG: 300mg
CBN: 150mg
```

Solved with 98% isolates:

```text
CBD isolate: 2296mg
CBG isolate: 306mg
CBN isolate: 153mg
```

### Sleep CBD/CBN

Per 1ml dose:

```text
CBD: 50mg
CBN: 25mg
```

Per 30ml bottle:

```text
CBD: 1500mg
CBN: 750mg
```

Solved with 98% isolates:

```text
CBD isolate: 1531mg
CBN isolate: 765mg
```

### THC Relaxation

Per 1ml dose:

```text
CBD: 75mg
CBG: 10mg
CBN: 5mg
THC: 25mg
```

Per 30ml bottle:

```text
CBD: 2250mg
CBG: 300mg
CBN: 150mg
THC: 750mg
```

Solved with 98% isolates and 80% RSO:

```text
CBD isolate: 2296mg
CBG isolate: 306mg
CBN isolate: 153mg
Local RSO: 938mg
```

Approximate RSO cost:

```text
0.938g * $8/g = $7.50
```

## Testing Priorities

Use Vitest for shared/domain tests covering:

- Doses per bottle.
- Target mg per bottle.
- Isolate amount solving.
- RSO THC solving.
- Unit conversion between mg and g.
- Density-based mass/volume conversion when density exists.
- Missing density warnings.
- Multi-compound contribution math.
- Cost calculation from total cost basis.
- Cost calculation from direct unit cost.
- Rounding rules.
- Under/met/over contribution status.
