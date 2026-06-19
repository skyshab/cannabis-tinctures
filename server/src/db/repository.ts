import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { calculateRecipe, type IngredientProduct, type Recipe } from "@tinctura/shared";

type IngredientRow = {
  id: string;
  name: string;
  category: IngredientProduct["category"];
  source: string | null;
  cost_basis_type: IngredientProduct["costBasisType"];
  cost_total: number | null;
  amount_purchased: number | null;
  amount_unit: IngredientProduct["amountUnit"] | null;
  unit_cost: number | null;
  unit_cost_unit: IngredientProduct["unitCostUnit"] | null;
  density_g_per_ml: number | null;
  density_source: IngredientProduct["densitySource"] | null;
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  ingredient_product_id: string;
  compound: string;
  concentration_type: IngredientProduct["activeProfile"][number]["concentrationType"];
  value: number;
  profile_source: IngredientProduct["activeProfile"][number]["profileSource"];
  notes: string | null;
};

type RecipeRow = {
  id: string;
  name: string;
  purpose: Recipe["purpose"] | null;
  bottle_volume_ml: number;
  dose_volume_ml: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type TargetRow = {
  id: string;
  recipe_id: string;
  compound: string;
  target_mg_per_dose: number;
};

type LineRow = {
  id: string;
  recipe_id: string;
  ingredient_product_id: string;
  amount: number;
  amount_unit: Recipe["ingredients"][number]["amountUnit"];
  locked: number;
  notes: string | null;
};

const defaultRecipeCategories = ["focus", "relaxation", "sleep", "thc_relaxation", "custom"];
const defaultAppBranding = {
  title: "Tinctura",
  tagline: "Local recipe planning."
};

export interface AppBranding {
  title: string;
  tagline: string;
}

function mapIngredient(row: IngredientRow, profiles: ProfileRow[]): IngredientProduct {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    source: row.source ?? undefined,
    costBasisType: row.cost_basis_type,
    costTotal: row.cost_total ?? undefined,
    amountPurchased: row.amount_purchased ?? undefined,
    amountUnit: row.amount_unit ?? undefined,
    unitCost: row.unit_cost ?? undefined,
    unitCostUnit: row.unit_cost_unit ?? undefined,
    densityGPerMl: row.density_g_per_ml ?? undefined,
    densitySource: row.density_source ?? undefined,
    notes: row.notes ?? undefined,
    isArchived: Boolean(row.is_archived),
    activeProfile: profiles.map((profile) => ({
      id: profile.id,
      ingredientProductId: profile.ingredient_product_id,
      compound: profile.compound,
      concentrationType: profile.concentration_type,
      value: profile.value,
      profileSource: profile.profile_source,
      notes: profile.notes ?? undefined
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapRecipe(row: RecipeRow, targets: TargetRow[], lines: LineRow[]): Recipe {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose ?? undefined,
    bottleVolumeMl: row.bottle_volume_ml,
    doseVolumeMl: row.dose_volume_ml,
    notes: row.notes ?? undefined,
    targets: targets.map((target) => ({
      id: target.id,
      recipeId: target.recipe_id,
      compound: target.compound,
      targetMgPerDose: target.target_mg_per_dose
    })),
    ingredients: lines.map((line) => ({
      id: line.id,
      recipeId: line.recipe_id,
      ingredientProductId: line.ingredient_product_id,
      amount: line.amount,
      amountUnit: line.amount_unit,
      locked: Boolean(line.locked),
      notes: line.notes ?? undefined
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createRepository(db: Database.Database) {
  function getAppBranding(): AppBranding {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get("app_branding") as
      | { value: string }
      | undefined;

    if (!row) return defaultAppBranding;

    try {
      const parsed = JSON.parse(row.value) as Partial<AppBranding>;
      return {
        title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : defaultAppBranding.title,
        tagline: typeof parsed.tagline === "string" ? parsed.tagline : defaultAppBranding.tagline
      };
    } catch {
      return defaultAppBranding;
    }
  }

  function saveAppBranding(branding: AppBranding): AppBranding {
    const nextBranding = {
      title: branding.title.trim() || defaultAppBranding.title,
      tagline: branding.tagline.trim()
    };

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    ).run("app_branding", JSON.stringify(nextBranding), new Date().toISOString());

    return nextBranding;
  }

  function getRecipeCategories(): string[] {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get("recipe_categories") as
      | { value: string }
      | undefined;

    if (!row) return defaultRecipeCategories;

    try {
      const parsed = JSON.parse(row.value) as unknown;
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed;
      }
    } catch {
      return defaultRecipeCategories;
    }

    return defaultRecipeCategories;
  }

  function saveRecipeCategories(categories: string[]): string[] {
    const cleaned = Array.from(
      new Set(categories.map((category) => category.trim()).filter((category) => category.length > 0))
    );
    const nextCategories = cleaned.length ? cleaned : defaultRecipeCategories;

    db.prepare(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`
    ).run("recipe_categories", JSON.stringify(nextCategories), new Date().toISOString());

    return nextCategories;
  }

  function listIngredients(): IngredientProduct[] {
    const rows = db
      .prepare("SELECT * FROM ingredient_products ORDER BY is_archived, category, name")
      .all() as IngredientRow[];
    const profiles = db
      .prepare("SELECT * FROM ingredient_active_profiles ORDER BY compound")
      .all() as ProfileRow[];

    return rows.map((row) =>
      mapIngredient(
        row,
        profiles.filter((profile) => profile.ingredient_product_id === row.id)
      )
    );
  }

  function listRecipes(): Recipe[] {
    const rows = db.prepare("SELECT * FROM recipes ORDER BY updated_at DESC, name").all() as RecipeRow[];
    const targets = db.prepare("SELECT * FROM recipe_targets ORDER BY compound").all() as TargetRow[];
    const lines = db.prepare("SELECT * FROM recipe_ingredient_lines ORDER BY rowid").all() as LineRow[];

    return rows.map((row) =>
      mapRecipe(
        row,
        targets.filter((target) => target.recipe_id === row.id),
        lines.filter((line) => line.recipe_id === row.id)
      )
    );
  }

  function getRecipe(id: string): Recipe | undefined {
    return listRecipes().find((recipe) => recipe.id === id);
  }

  function getIngredient(id: string): IngredientProduct | undefined {
    return listIngredients().find((ingredient) => ingredient.id === id);
  }

  const saveIngredientTransaction = db.transaction((ingredient: IngredientProduct) => {
    const now = new Date().toISOString();
    const id = ingredient.id || randomUUID();
    const existing = db.prepare("SELECT id, created_at FROM ingredient_products WHERE id = ?").get(id) as
      | { id: string; created_at: string }
      | undefined;

    db.prepare(
      `INSERT INTO ingredient_products (
        id, name, category, source, cost_basis_type, cost_total, amount_purchased,
        amount_unit, unit_cost, unit_cost_unit, density_g_per_ml, density_source,
        notes, is_archived, created_at, updated_at
      ) VALUES (
        @id, @name, @category, @source, @costBasisType, @costTotal, @amountPurchased,
        @amountUnit, @unitCost, @unitCostUnit, @densityGPerMl, @densitySource,
        @notes, @isArchived, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        source = excluded.source,
        cost_basis_type = excluded.cost_basis_type,
        cost_total = excluded.cost_total,
        amount_purchased = excluded.amount_purchased,
        amount_unit = excluded.amount_unit,
        unit_cost = excluded.unit_cost,
        unit_cost_unit = excluded.unit_cost_unit,
        density_g_per_ml = excluded.density_g_per_ml,
        density_source = excluded.density_source,
        notes = excluded.notes,
        is_archived = excluded.is_archived,
        updated_at = excluded.updated_at`
    ).run({
      id,
      name: ingredient.name,
      category: ingredient.category,
      source: ingredient.source ?? null,
      costBasisType: ingredient.costBasisType,
      costTotal: ingredient.costTotal ?? null,
      amountPurchased: ingredient.amountPurchased ?? null,
      amountUnit: ingredient.amountUnit ?? null,
      unitCost: ingredient.unitCost ?? null,
      unitCostUnit: ingredient.unitCostUnit ?? null,
      densityGPerMl: ingredient.densityGPerMl ?? null,
      densitySource: ingredient.densitySource ?? null,
      notes: ingredient.notes ?? null,
      isArchived: ingredient.isArchived ? 1 : 0,
      createdAt: existing?.created_at ?? now,
      updatedAt: now
    });

    db.prepare("DELETE FROM ingredient_active_profiles WHERE ingredient_product_id = ?").run(id);

    const insertProfile = db.prepare(
      `INSERT INTO ingredient_active_profiles (
        id, ingredient_product_id, compound, concentration_type, value, profile_source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const profile of ingredient.activeProfile) {
      insertProfile.run(
        profile.id ?? randomUUID(),
        id,
        profile.compound,
        profile.concentrationType,
        profile.value,
        profile.profileSource,
        profile.notes ?? null
      );
    }

    return id;
  });

  function saveIngredient(ingredient: IngredientProduct): IngredientProduct {
    const id = saveIngredientTransaction(ingredient);
    const saved = getIngredient(id);
    if (!saved) throw new Error("Ingredient save failed.");
    return saved;
  }

  function deleteIngredient(id: string): void {
    db.prepare("DELETE FROM ingredient_products WHERE id = ?").run(id);
  }

  const saveRecipeTransaction = db.transaction((recipe: Recipe) => {
    const now = new Date().toISOString();
    const id = recipe.id || randomUUID();
    const existing = db.prepare("SELECT id, created_at FROM recipes WHERE id = ?").get(id) as
      | { id: string; created_at: string }
      | undefined;

    db.prepare(
      `INSERT INTO recipes (
        id, name, purpose, bottle_volume_ml, dose_volume_ml, notes, created_at, updated_at
      ) VALUES (
        @id, @name, @purpose, @bottleVolumeMl, @doseVolumeMl, @notes, @createdAt, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        purpose = excluded.purpose,
        bottle_volume_ml = excluded.bottle_volume_ml,
        dose_volume_ml = excluded.dose_volume_ml,
        notes = excluded.notes,
        updated_at = excluded.updated_at`
    ).run({
      id,
      name: recipe.name,
      purpose: recipe.purpose ?? null,
      bottleVolumeMl: recipe.bottleVolumeMl,
      doseVolumeMl: recipe.doseVolumeMl,
      notes: recipe.notes ?? null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now
    });

    db.prepare("DELETE FROM recipe_targets WHERE recipe_id = ?").run(id);
    db.prepare("DELETE FROM recipe_ingredient_lines WHERE recipe_id = ?").run(id);

    const insertTarget = db.prepare(
      `INSERT INTO recipe_targets (id, recipe_id, compound, target_mg_per_dose)
       VALUES (?, ?, ?, ?)`
    );
    for (const target of recipe.targets) {
      insertTarget.run(target.id ?? randomUUID(), id, target.compound, target.targetMgPerDose);
    }

    const insertLine = db.prepare(
      `INSERT INTO recipe_ingredient_lines (
        id, recipe_id, ingredient_product_id, amount, amount_unit, locked, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const line of recipe.ingredients) {
      insertLine.run(
        line.id ?? randomUUID(),
        id,
        line.ingredientProductId,
        line.amount,
        line.amountUnit,
        line.locked ? 1 : 0,
        line.notes ?? null
      );
    }

    return id;
  });

  function saveRecipe(recipe: Recipe): Recipe {
    const id = saveRecipeTransaction(recipe);
    const saved = getRecipe(id);
    if (!saved) throw new Error("Recipe save failed.");
    return saved;
  }

  function deleteRecipe(id: string): void {
    db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
  }

  function recipeSummaries() {
    const ingredients = listIngredients();
    return listRecipes().map((recipe) => ({
      recipe,
      calculation: calculateRecipe(recipe, ingredients)
    }));
  }

  return {
    getAppBranding,
    saveAppBranding,
    getRecipeCategories,
    saveRecipeCategories,
    listIngredients,
    getIngredient,
    saveIngredient,
    deleteIngredient,
    listRecipes,
    getRecipe,
    saveRecipe,
    deleteRecipe,
    recipeSummaries
  };
}
