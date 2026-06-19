# Tinctura — Project README

## Project purpose

This project is a local-first web app for designing, costing, saving, and revising custom cannabis tincture blends.

The core use case is creating a standard 30ml tincture bottle where a 1ml dropper is treated as one dose. The user enters desired per-dose targets, selects available source ingredients, and the app calculates the total ingredient amounts needed per bottle.

The app should also track raw ingredient products, including source/vendor, cannabinoid profile, potency, amount purchased, cost, and notes. These ingredient products are then used to calculate recipe costs per bottle and per 1ml dose.

## Important project context

The user is building blends from a mix of:

- Cannabinoid isolates, such as CBD, CBG, CBN, CBC, and possibly THCA.
- Full-spectrum CBD distillates that contain CBD plus secondary cannabinoids and terpenes.
- RSO or THC-rich extracts, especially local RSO around 80% THC.
- Terpene blends, added at low percentages.
- Carrier oil, most likely MCT oil.
- Possibly small amounts of Everclear or other solvent only if needed for handling or dissolution.

A key requirement is that source ingredients can contribute more than one active compound. For example, a full-spectrum CBD distillate may contribute CBD, minor CBG, minor CBN, and terpenes. The recipe solver must account for those secondary contributions automatically instead of requiring the user to enter CBG/CBN again separately.

## App philosophy

This should start simple and local-first.

A good v1 should avoid over-engineering and focus on accurate calculations, durable storage, and a clear UI for entering products and creating recipes.

Suggested v1 stack direction:

- Single-user local app.
- SQLite database for saved ingredients and recipes.
- Browser/local app state for unsaved recipe drafts.
- Explicit Save action writes finalized recipes to SQLite.
- Simple responsive web UI.
- Keep the calculation engine separate from UI components.

The app does not need authentication, cloud sync, complex inventory decrementing, barcode scanning, or ecommerce features in v1.

## Core user workflows

### 1. Manage ingredient products

The user should be able to create, view, edit, and archive raw ingredient products.

Each product should include:

- Name
- Category
- Source/vendor
- Purchase date, optional
- Cost
- Amount purchased
- Unit type
- Potency/concentration
- Active compound profile
- Notes

Products should support multiple active compounds. Example: a CBD distillate product could have CBD, CBG, CBN, and terpene percentages.

### 2. Create a tincture recipe

The user enters:

- Blend name
- Bottle size, default 30ml
- Dose size, default 1ml
- Target amount per dose for each desired active compound
- Selected ingredients/products
- Optional terpene percentage
- Carrier oil

The app calculates:

- Total active targets per bottle
- Amount of each product to use
- Contributions from each product to each active compound
- Any remaining targets not met
- Any overages
- Carrier amount needed to reach final bottle volume
- Cost per bottle
- Cost per dose

### 3. Work with drafts

Recipe editing may use browser/local state until the user explicitly saves.

Requirements:

- Draft changes should not automatically overwrite saved recipes.
- The user can experiment with ratios without committing them.
- A Save button writes the finished recipe to SQLite.
- A saved recipe can later be duplicated or revised.

### 4. Browse saved recipes

The app should provide a quick recipe list with:

- Blend name
- Purpose/category
- Bottle size
- Dose size
- Key per-dose actives
- Cost per bottle
- Cost per dose
- Date created/updated

## Formula conventions

Default bottle size: 30ml.

Default dose size: 1ml.

Default doses per bottle: 30.

For a target of `X mg per 1ml dose`:

```text
Total mg per bottle = X * 30
```

For a source ingredient with potency `P` as a decimal fraction:

```text
Ingredient mass required = target mg / P
```

Example: 300mg THC target using 80% THC RSO:

```text
300mg / 0.80 = 375mg RSO
```

If ingredient density is unknown, the app should avoid pretending mass and volume are equivalent. It can estimate only when the user explicitly accepts a density assumption.

## Safety and scope notes

This app is for recipe planning and recordkeeping. It should not make medical claims or advise users to treat diseases.

Include warnings in the UI where relevant:

- Cannabinoid potency can vary by batch and lab result.
- THC effects vary widely by person and route of administration.
- Start low and test cautiously, especially with THC, CBN, and terpene additions.
- Recipes should comply with local laws.
- Terpenes are potent and should be used conservatively.

## Recommended file organization for the future app

Example structure:

```text
hemp-tincture-app/
  docs/
    hemp_project_README.md
    ingredient_details.md
    blend_recipes.md
    app_planning.md
  src/
    domain/
      calculations.ts
      recipeSolver.ts
      units.ts
    db/
      schema.sql
      migrations/
    ui/
      components/
      pages/
    data/
      seedIngredients.ts
```

## First task for Codex or another coding agent

Before building, clarify the v1 technical approach:

1. Should this be a local desktop-style web app, a standard local web server app, or a browser-only app with SQLite/WASM?
2. Should the UI be React, Vue, Svelte, plain TypeScript, or another preferred framework?
3. Should SQLite be accessed through a lightweight local backend, Electron/Tauri, or sql.js/SQLite WASM?
4. Should recipe solving be manual-assist in v1, or should the app automatically solve optimal ingredient amounts?
5. Should inventory decrementing be included in v1, or should ingredient products be used only for costing/reference?

Recommended v1 answer unless the user overrides it:

- Use a local web app with a small backend and SQLite.
- Use TypeScript for the calculation engine.
- Keep inventory decrementing out of v1.
- Implement explicit Save behavior.
- Build the domain model and calculation engine first, then the UI.
