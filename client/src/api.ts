import type { IngredientProduct, Recipe, RecipeCalculationResult } from "@tinctura/shared";

export interface RecipeSummary {
  recipe: Recipe;
  calculation: RecipeCalculationResult;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      message = parsed.message ?? text;
    } catch {
      message = text;
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function fetchIngredients(): Promise<IngredientProduct[]> {
  return request("/api/ingredients");
}

export function createIngredient(ingredient: IngredientProduct): Promise<IngredientProduct> {
  return request("/api/ingredients", {
    method: "POST",
    body: JSON.stringify(ingredient)
  });
}

export function saveIngredient(ingredient: IngredientProduct): Promise<IngredientProduct> {
  return request(`/api/ingredients/${ingredient.id}`, {
    method: "PUT",
    body: JSON.stringify(ingredient)
  });
}

export function deleteIngredient(id: string): Promise<{ ok: true }> {
  return request(`/api/ingredients/${id}`, {
    method: "DELETE"
  });
}

export function fetchRecipes(): Promise<RecipeSummary[]> {
  return request("/api/recipes");
}

export function fetchRecipeCategories(): Promise<{ categories: string[] }> {
  return request("/api/settings/recipe-categories");
}

export function saveRecipeCategories(categories: string[]): Promise<{ categories: string[] }> {
  return request("/api/settings/recipe-categories", {
    method: "PUT",
    body: JSON.stringify({ categories })
  });
}

export function saveRecipe(recipe: Recipe): Promise<Recipe> {
  return request(`/api/recipes/${recipe.id}`, {
    method: "PUT",
    body: JSON.stringify(recipe)
  });
}

export function createRecipe(recipe: Recipe): Promise<Recipe> {
  return request("/api/recipes", {
    method: "POST",
    body: JSON.stringify(recipe)
  });
}

export function deleteRecipe(id: string): Promise<{ ok: true }> {
  return request(`/api/recipes/${id}`, {
    method: "DELETE"
  });
}
