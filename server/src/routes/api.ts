import type { FastifyInstance } from "fastify";
import type { IngredientProduct, Recipe } from "@cannabis-tinctures/shared";
import type { createRepository } from "../db/repository.js";

type Repository = ReturnType<typeof createRepository>;

export async function registerApiRoutes(app: FastifyInstance, repo: Repository): Promise<void> {
  app.get("/api/health", async () => ({ ok: true }));

  app.get("/api/settings/branding", async () => repo.getAppBranding());

  app.put<{ Body: { title: string; tagline: string } }>("/api/settings/branding", async (request) =>
    repo.saveAppBranding(request.body)
  );

  app.get("/api/settings/recipe-categories", async () => ({ categories: repo.getRecipeCategories() }));

  app.put<{ Body: { categories: string[] } }>("/api/settings/recipe-categories", async (request) => ({
    categories: repo.saveRecipeCategories(request.body.categories)
  }));

  app.get("/api/ingredients", async () => repo.listIngredients());

  app.post<{ Body: IngredientProduct }>("/api/ingredients", async (request) => repo.saveIngredient(request.body));

  app.put<{ Params: { id: string }; Body: IngredientProduct }>("/api/ingredients/:id", async (request) =>
    repo.saveIngredient({ ...request.body, id: request.params.id })
  );

  app.delete<{ Params: { id: string } }>("/api/ingredients/:id", async (request, reply) => {
    try {
      repo.deleteIngredient(request.params.id);
      return { ok: true };
    } catch {
      await reply.code(409).send({
        message: "Ingredient cannot be deleted because it is used by one or more recipes."
      });
    }
  });

  app.get("/api/recipes", async () => repo.recipeSummaries());

  app.get<{ Params: { id: string } }>("/api/recipes/:id", async (request, reply) => {
    const recipe = repo.getRecipe(request.params.id);
    if (!recipe) {
      await reply.code(404).send({ message: "Recipe not found." });
      return;
    }

    return recipe;
  });

  app.post<{ Body: Recipe }>("/api/recipes", async (request) => repo.saveRecipe(request.body));

  app.put<{ Params: { id: string }; Body: Recipe }>("/api/recipes/:id", async (request) =>
    repo.saveRecipe({ ...request.body, id: request.params.id })
  );

  app.delete<{ Params: { id: string } }>("/api/recipes/:id", async (request) => {
    repo.deleteRecipe(request.params.id);
    return { ok: true };
  });
}
