import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  calculateRecipe,
  type ActiveProfileEntry,
  type AmountUnit,
  type ConcentrationType,
  type CostBasisType,
  type IngredientCategory,
  type IngredientProduct,
  type ProfileSource,
  type Recipe,
  type RecipeIngredientLine,
  type RecipeTarget
} from "@cannabis-tinctures/shared";
import {
  createIngredient,
  deleteIngredient,
  deleteRecipe,
  fetchAppBranding,
  fetchIngredients,
  fetchRecipeCategories,
  fetchRecipes,
  saveAppBranding,
  saveIngredient,
  saveRecipeCategories,
  saveRecipe,
  type AppBranding,
  type RecipeSummary
} from "./api";
import { compoundSummary, money, number } from "./format";

type View = "recipes" | "ingredients" | "settings";
type DetailMode = "read" | "edit";
type ToastKind = "info" | "success" | "error";
type AppRoute =
  | { name: "recipes" }
  | { name: "recipeNewStart" }
  | { name: "recipeNewScratch" }
  | { name: "recipeNewFrom"; sourceId: string }
  | { name: "recipeDetail"; id: string; mode: DetailMode }
  | { name: "ingredients" }
  | { name: "ingredientNew" }
  | { name: "ingredientDetail"; id: string; mode: DetailMode }
  | { name: "settings" };
type PendingDelete =
  | { kind: "recipe"; item: Recipe }
  | { kind: "ingredient"; item: IngredientProduct };

interface ToastState {
  message: string;
  kind: ToastKind;
}

const categories: IngredientCategory[] = [
  "isolate",
  "distillate",
  "rso",
  "terpene_blend",
  "carrier_oil",
  "solvent",
  "other"
];
const amountUnits: AmountUnit[] = ["mg", "g", "ml"];
const costBasisTypes: CostBasisType[] = ["total_cost", "unit_cost", "none"];
const concentrationTypes: ConcentrationType[] = ["percent_by_mass", "mg_per_g", "mg_per_ml", "percent_by_volume"];
const profileSources: ProfileSource[] = ["coa", "vendor_label", "estimate", "unknown"];
const fallbackRecipeCategories = ["focus", "relaxation", "sleep", "thc_relaxation", "custom"];
const fallbackBranding: AppBranding = {
  title: "Cannabis Tinctures",
  tagline: "Local recipe planning."
};

const nowIso = () => new Date().toISOString();
const recipePath = (id: string, mode: DetailMode = "read") => `/recipes/${encodeURIComponent(id)}${mode === "edit" ? "/edit" : ""}`;
const ingredientPath = (id: string, mode: DetailMode = "read") => `/ingredients/${encodeURIComponent(id)}${mode === "edit" ? "/edit" : ""}`;

function parseRoute(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (segments.length === 0) return { name: "recipes" };
  if (segments[0] === "settings") return { name: "settings" };

  if (segments[0] === "ingredients") {
    if (segments[1] === "new") return { name: "ingredientNew" };
    if (segments[1]) {
      return {
        name: "ingredientDetail",
        id: segments[1],
        mode: segments[2] === "edit" ? "edit" : "read"
      };
    }
    return { name: "ingredients" };
  }

  if (segments[0] === "recipes") {
    if (segments[1] === "new" && segments[2] === "scratch") return { name: "recipeNewScratch" };
    if (segments[1] === "new" && segments[2] === "from" && segments[3]) {
      return { name: "recipeNewFrom", sourceId: segments[3] };
    }
    if (segments[1] === "new") return { name: "recipeNewStart" };
    if (segments[1]) {
      return {
        name: "recipeDetail",
        id: segments[1],
        mode: segments[2] === "edit" ? "edit" : "read"
      };
    }
    return { name: "recipes" };
  }

  return { name: "recipes" };
}

function routeSection(route: AppRoute): View {
  if (route.name.startsWith("ingredient")) return "ingredients";
  if (route.name === "settings") return "settings";
  return "recipes";
}

function defaultRecipe(ingredients: IngredientProduct[]): Recipe {
  const everclear = ingredients.find((ingredient) => ingredient.name === "Everclear");
  const mct = ingredients.find((ingredient) => ingredient.name === "MCT Oil");
  const now = nowIso();

  return {
    id: crypto.randomUUID(),
    name: "New Recipe",
    purpose: "custom",
    bottleVolumeMl: 30,
    doseVolumeMl: 1,
    targets: [],
    ingredients: [
      ...(everclear ? [{ ingredientProductId: everclear.id, amount: 3, amountUnit: "ml" as const }] : []),
      ...(mct ? [{ ingredientProductId: mct.id, amount: 27, amountUnit: "ml" as const }] : [])
    ],
    notes: "",
    createdAt: now,
    updatedAt: now
  };
}

function defaultIngredient(): IngredientProduct {
  const now = nowIso();

  return {
    id: crypto.randomUUID(),
    name: "New Ingredient",
    category: "other",
    source: "",
    costBasisType: "none",
    notes: "",
    isArchived: false,
    activeProfile: [],
    createdAt: now,
    updatedAt: now
  };
}

function cloneRecipe(recipe: Recipe, name = `${recipe.name} Copy`): Recipe {
  const now = nowIso();

  return {
    ...structuredClone(recipe),
    id: crypto.randomUUID(),
    name,
    targets: recipe.targets.map(({ id: _id, recipeId: _recipeId, ...target }) => target),
    ingredients: recipe.ingredients.map(({ id: _id, recipeId: _recipeId, ...line }) => line),
    createdAt: now,
    updatedAt: now
  };
}

export function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [ingredients, setIngredients] = useState<IngredientProduct[]>([]);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipeCategories, setRecipeCategories] = useState<string[]>(fallbackRecipeCategories);
  const [branding, setBranding] = useState<AppBranding>(fallbackBranding);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipeMode, setRecipeMode] = useState<DetailMode>("read");
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientProduct | null>(null);
  const [ingredientMode, setIngredientMode] = useState<DetailMode>("read");
  const [showRecipeStart, setShowRecipeStart] = useState(false);
  const [toast, setToast] = useState<ToastState | null>({ message: "Loading app data...", kind: "info" });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const route = useMemo(() => parseRoute(pathname), [pathname]);
  const view = routeSection(route);

  function showToast(message: string, kind: ToastKind = "info") {
    setToast({ message, kind });
  }

  async function load() {
    const [ingredientData, recipeData, categoryData, brandingData] = await Promise.all([
      fetchIngredients(),
      fetchRecipes(),
      fetchRecipeCategories(),
      fetchAppBranding()
    ]);
    setIngredients(ingredientData);
    setRecipes(recipeData);
    setRecipeCategories(categoryData.categories);
    setBranding(brandingData);
  }

  useEffect(() => {
    load()
      .then(() => setToast(null))
      .catch((error: unknown) => showToast(error instanceof Error ? error.message : "Unable to load app data.", "error"));
  }, []);

  useEffect(() => {
    document.title = branding.title || fallbackBranding.title;
  }, [branding.title]);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
      setPendingDelete(null);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, toast.kind === "error" ? 6000 : 2800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (route.name === "recipeDetail") {
      const recipe = recipes.find(({ recipe: item }) => item.id === route.id)?.recipe;
      setSelectedRecipe(recipe ? structuredClone(recipe) : null);
      setRecipeMode(route.mode);
      setSelectedIngredient(null);
      setIngredientMode("read");
      setShowRecipeStart(false);
      return;
    }

    if (route.name === "recipeNewStart") {
      setSelectedRecipe(null);
      setRecipeMode("read");
      setSelectedIngredient(null);
      setIngredientMode("read");
      setShowRecipeStart(true);
      return;
    }

    if (route.name === "recipeNewScratch") {
      setSelectedRecipe(defaultRecipe(ingredients));
      setRecipeMode("edit");
      setSelectedIngredient(null);
      setIngredientMode("read");
      setShowRecipeStart(false);
      return;
    }

    if (route.name === "recipeNewFrom") {
      const sourceRecipe = recipes.find(({ recipe }) => recipe.id === route.sourceId)?.recipe;
      setSelectedRecipe(sourceRecipe ? cloneRecipe(sourceRecipe, `New from ${sourceRecipe.name}`) : null);
      setRecipeMode("edit");
      setSelectedIngredient(null);
      setIngredientMode("read");
      setShowRecipeStart(false);
      return;
    }

    if (route.name === "ingredientDetail") {
      const ingredient = ingredients.find((item) => item.id === route.id);
      setSelectedIngredient(ingredient ? structuredClone(ingredient) : null);
      setIngredientMode(route.mode);
      setSelectedRecipe(null);
      setRecipeMode("read");
      setShowRecipeStart(false);
      return;
    }

    if (route.name === "ingredientNew") {
      setSelectedIngredient(defaultIngredient());
      setIngredientMode("edit");
      setSelectedRecipe(null);
      setRecipeMode("read");
      setShowRecipeStart(false);
      return;
    }

    setShowRecipeStart(false);
    setSelectedRecipe(null);
    setRecipeMode("read");
    setSelectedIngredient(null);
    setIngredientMode("read");
  }, [ingredients, recipes, route]);

  function navigate(path: string, options: { replace?: boolean } = {}) {
    if (window.location.pathname === path) return;

    if (options.replace) {
      window.history.replaceState(null, "", path);
    } else {
      window.history.pushState(null, "", path);
    }

    setPathname(window.location.pathname);
    setPendingDelete(null);
  }

  function selectView(nextView: View) {
    navigate(nextView === "settings" ? "/settings" : `/${nextView}`);
  }

  function openRecipe(recipe: Recipe) {
    navigate(recipePath(recipe.id));
  }

  async function handleSaveRecipe(recipe: Recipe) {
    setIsSaving(true);
    showToast("Saving recipe...");
    try {
      const saved = await saveRecipe(recipe);
      await load();
      setSelectedRecipe(saved);
      setRecipeMode("read");
      setShowRecipeStart(false);
      navigate(recipePath(saved.id));
      showToast("Recipe saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Save failed.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteRecipe(recipe: Recipe) {
    showToast("Deleting recipe...");
    try {
      await deleteRecipe(recipe.id);
      await load();
      setSelectedRecipe(null);
      setRecipeMode("read");
      setPendingDelete(null);
      navigate("/recipes");
      showToast("Recipe deleted.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Delete failed.", "error");
    }
  }

  async function handleDeleteIngredient(ingredient: IngredientProduct) {
    showToast("Deleting ingredient...");
    try {
      await deleteIngredient(ingredient.id);
      await load();
      setSelectedIngredient(null);
      setIngredientMode("read");
      setPendingDelete(null);
      navigate("/ingredients");
      showToast("Ingredient deleted.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ingredient delete failed.", "error");
    }
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.kind === "recipe") {
      void handleDeleteRecipe(pendingDelete.item);
      return;
    }

    void handleDeleteIngredient(pendingDelete.item);
  }

  async function handleSaveIngredient(ingredient: IngredientProduct) {
    setIsSaving(true);
    showToast("Saving ingredient...");
    try {
      const exists = ingredients.some((item) => item.id === ingredient.id);
      const saved = exists ? await saveIngredient(ingredient) : await createIngredient(ingredient);
      await load();
      setSelectedIngredient(saved);
      setIngredientMode("read");
      navigate(ingredientPath(saved.id));
      showToast("Ingredient saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Ingredient save failed.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveRecipeCategories(categories: string[]) {
    setIsSaving(true);
    showToast("Saving categories...");
    try {
      const saved = await saveRecipeCategories(categories);
      setRecipeCategories(saved.categories);
      showToast("Categories saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Category save failed.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveBranding(nextBranding: AppBranding) {
    setIsSaving(true);
    showToast("Saving app branding...");
    try {
      const saved = await saveAppBranding(nextBranding);
      setBranding(saved);
      showToast("App branding saved.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Branding save failed.", "error");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedRecipeExists = Boolean(selectedRecipe && recipes.some(({ recipe }) => recipe.id === selectedRecipe.id));
  const selectedIngredientExists = Boolean(selectedIngredient && ingredients.some((item) => item.id === selectedIngredient.id));

  return (
    <div className="app-shell bg-[#f7faf7] text-ink">
      <aside className="app-sidebar bg-white">
        <div className="sticky top-0 flex min-h-screen flex-col p-4">
          <div>
            <div className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight">{branding.title}</h1>
              {branding.tagline ? <p className="mt-1 text-sm text-slate-600">{branding.tagline}</p> : null}
            </div>

            <nav className="grid gap-2">
            <NavButton active={view === "ingredients"} onClick={() => selectView("ingredients")}>
              Ingredients
            </NavButton>

            <NavButton active={view === "recipes"} onClick={() => selectView("recipes")}>
              Recipes
            </NavButton>

              <div className="ml-2 grid gap-1 border-l border-slate-200 pl-3">
                {recipes.slice(0, 10).map(({ recipe }) => (
                  <button
                    className={`truncate rounded-md px-2 py-1.5 text-left text-sm ${
                      selectedRecipe?.id === recipe.id
                        ? "bg-mist font-medium text-leaf"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    key={recipe.id}
                    onClick={() => openRecipe(recipe)}
                    title={recipe.name}
                    type="button"
                  >
                    {recipe.name}
                  </button>
                ))}

                {recipes.length > 10 ? (
                  <button
                    className="rounded-md px-2 py-1.5 text-left text-sm font-medium text-leaf hover:bg-mist"
                    onClick={() => selectView("recipes")}
                    type="button"
                  >
                    See all recipes
                  </button>
                ) : null}
              </div>
          </nav>
          </div>

          <button
            aria-label="Settings"
            className={`mt-auto flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
              view === "settings" ? "bg-leaf text-white" : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => selectView("settings")}
            title="Settings"
            type="button"
          >
            <span>Settings</span>
            <GearIcon />
          </button>
        </div>
      </aside>

      <main className="app-main px-4 py-6 md:px-8">
        {view === "recipes" ? (
          selectedRecipe ? (
            <RecipeDetailView
              ingredients={ingredients}
              recipeCategories={recipeCategories}
              isExisting={selectedRecipeExists}
              isSaving={isSaving}
              mode={recipeMode}
              recipe={selectedRecipe}
              onBack={() => navigate("/recipes")}
              onCancel={() => {
                if (selectedRecipeExists) {
                  navigate(recipePath(selectedRecipe.id));
                } else {
                  navigate("/recipes");
                }
              }}
              onDelete={(recipe) => setPendingDelete({ kind: "recipe", item: recipe })}
              onDuplicate={(recipe) => navigate(`/recipes/new/from/${encodeURIComponent(recipe.id)}`)}
              onEdit={() => selectedRecipe && navigate(recipePath(selectedRecipe.id, "edit"))}
              onSave={handleSaveRecipe}
            />
          ) : (
            <RecipesListView
              recipes={recipes}
              showStart={showRecipeStart}
              onNew={() => navigate("/recipes/new")}
              onSelect={(recipe) => navigate(recipePath(recipe.id))}
              onStartFromRecipe={(recipe) => navigate(`/recipes/new/from/${encodeURIComponent(recipe.id)}`)}
              onStartScratch={() => navigate("/recipes/new/scratch")}
            />
          )
        ) : null}

        {view === "ingredients" ? (
          selectedIngredient ? (
            <IngredientDetailView
              ingredient={selectedIngredient}
              isExisting={selectedIngredientExists}
              isSaving={isSaving}
              mode={ingredientMode}
              onBack={() => navigate("/ingredients")}
              onCancel={() => {
                if (selectedIngredientExists) {
                  navigate(ingredientPath(selectedIngredient.id));
                } else {
                  navigate("/ingredients");
                }
              }}
              onEdit={() => selectedIngredient && navigate(ingredientPath(selectedIngredient.id, "edit"))}
              onDelete={(ingredient) => setPendingDelete({ kind: "ingredient", item: ingredient })}
              onSave={handleSaveIngredient}
            />
          ) : (
            <IngredientsListView
              ingredients={ingredients}
              onNew={() => navigate("/ingredients/new")}
              onSelect={(ingredient) => navigate(ingredientPath(ingredient.id))}
            />
          )
        ) : null}

        {view === "settings" ? (
          <SettingsView
            branding={branding}
            isSaving={isSaving}
            recipeCategories={recipeCategories}
            onSaveBranding={handleSaveBranding}
            onSaveRecipeCategories={handleSaveRecipeCategories}
          />
        ) : null}
      </main>

      {pendingDelete ? (
        <ConfirmDeleteDialog
          itemKind={pendingDelete.kind}
          itemName={pendingDelete.item.name}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      {toast ? <Toast message={toast.message} kind={toast.kind} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}

function Toast({ message, kind, onDismiss }: { message: string; kind: ToastKind; onDismiss: () => void }) {
  const colorClass =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : kind === "success"
        ? "border-leaf/30 bg-mist text-leaf"
        : "border-slate-200 bg-white text-slate-800";

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${colorClass}`}>
        <span>{message}</span>
        <button className="rounded px-1.5 py-0.5 text-xs opacity-70 hover:bg-black/5 hover:opacity-100" onClick={onDismiss} type="button">
          Dismiss
        </button>
      </div>
    </div>
  );
}

function NavButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={`rounded-md px-3 py-2 text-left text-sm font-medium ${
        active ? "bg-leaf text-white" : "text-slate-700 hover:bg-slate-100"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function GearIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M10.3 4.4 11 2h2l.7 2.4a7.9 7.9 0 0 1 1.8.8l2.2-1.2 1.4 1.4-1.2 2.2c.3.6.6 1.2.8 1.8L21 10v2l-2.3.7a7.9 7.9 0 0 1-.8 1.8l1.2 2.2-1.4 1.4-2.2-1.2c-.6.3-1.2.6-1.8.8L13 22h-2l-.7-2.3a7.9 7.9 0 0 1-1.8-.8l-2.2 1.2-1.4-1.4 1.2-2.2a7.9 7.9 0 0 1-.8-1.8L3 12v-2l2.3-.6c.2-.7.5-1.3.8-1.9L4.9 5.3l1.4-1.4 2.2 1.2c.6-.3 1.2-.6 1.8-.7Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M9 4h6m-8 4h10m-9 0 .7 12h6.6L16 8M10 11v6m4-6v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ConfirmDeleteDialog({
  itemKind,
  itemName,
  onCancel,
  onConfirm
}: {
  itemKind: "recipe" | "ingredient";
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/30 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold">Delete {itemKind}?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Are you sure you want to delete <span className="font-medium text-slate-900">{itemName}</span>? This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white" onClick={onConfirm} type="button">
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-leaf hover:underline" onClick={onClick} type="button">
      <span aria-hidden="true">&larr;</span>
      {label}
    </button>
  );
}

function RecipesListView({
  recipes,
  showStart,
  onNew,
  onSelect,
  onStartScratch,
  onStartFromRecipe
}: {
  recipes: RecipeSummary[];
  showStart: boolean;
  onNew: () => void;
  onSelect: (recipe: Recipe) => void;
  onStartScratch: () => void;
  onStartFromRecipe: (recipe: Recipe) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Recipes</h2>
          <p className="text-sm text-slate-600">Open a saved recipe or start a new one.</p>
        </div>
        <button className="rounded-md bg-leaf px-3 py-2 text-sm font-medium text-white" onClick={onNew} type="button">
          New Recipe
        </button>
      </div>

      {showStart ? (
        <RecipeStartPanel
          recipes={recipes.map(({ recipe }) => recipe)}
          onFromRecipe={onStartFromRecipe}
          onScratch={onStartScratch}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {recipes.map(({ recipe, calculation }) => (
          <button
            className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-leaf/50 hover:shadow-md"
            key={recipe.id}
            onClick={() => onSelect(recipe)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{recipe.name}</h3>
                <p className="text-sm text-slate-500">{formatCategory(recipe.purpose ?? "custom")}</p>
              </div>
              <div className="rounded bg-mist px-2 py-1 text-xs text-leaf">
                {recipe.bottleVolumeMl}ml / {recipe.doseVolumeMl}ml
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700">{compoundSummary(recipe.targets)}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Bottle cost" value={money(calculation.totalCost)} />
              <Metric label="Dose cost" value={money(calculation.costPerDose)} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RecipeStartPanel({
  recipes,
  onScratch,
  onFromRecipe
}: {
  recipes: Recipe[];
  onScratch: () => void;
  onFromRecipe: (recipe: Recipe) => void;
}) {
  const [sourceRecipeId, setSourceRecipeId] = useState(recipes[0]?.id ?? "");
  const sourceRecipe = recipes.find((recipe) => recipe.id === sourceRecipeId);

  useEffect(() => {
    if (!sourceRecipeId && recipes[0]) {
      setSourceRecipeId(recipes[0].id);
    }
  }, [recipes, sourceRecipeId]);

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Start New Recipe</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button className="rounded-md bg-leaf px-3 py-2 text-sm font-medium text-white" onClick={onScratch} type="button">
          Start from Scratch
        </button>

        <div className="rounded-md border border-slate-200 p-3">
          <label className="grid gap-1 text-sm text-slate-600">
            <span>Use existing recipe as a start</span>
            <select className="input" value={sourceRecipeId} onChange={(event) => setSourceRecipeId(event.target.value)}>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!sourceRecipe}
            onClick={() => sourceRecipe && onFromRecipe(sourceRecipe)}
            type="button"
          >
            Start from Selected
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeDetailView({
  ingredients,
  recipeCategories,
  isExisting,
  isSaving,
  mode,
  recipe,
  onBack,
  onCancel,
  onDelete,
  onDuplicate,
  onEdit,
  onSave
}: {
  ingredients: IngredientProduct[];
  recipeCategories: string[];
  isExisting: boolean;
  isSaving: boolean;
  mode: DetailMode;
  recipe: Recipe;
  onBack: () => void;
  onCancel: () => void;
  onDelete: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  onEdit: () => void;
  onSave: (recipe: Recipe) => void;
}) {
  return (
    <section>
      <BackLink label="Recipes" onClick={onBack} />
      {mode === "edit" ? (
        <RecipeEditor
          ingredients={ingredients}
          recipeCategories={recipeCategories}
          isSaving={isSaving}
          recipe={recipe}
          onCancel={onCancel}
          onSave={onSave}
        />
      ) : (
        <RecipeReadOnly
          ingredients={ingredients}
          isExisting={isExisting}
          recipe={recipe}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
        />
      )}
    </section>
  );
}

function RecipeReadOnly({
  ingredients,
  isExisting,
  recipe,
  onDelete,
  onDuplicate,
  onEdit
}: {
  ingredients: IngredientProduct[];
  isExisting: boolean;
  recipe: Recipe;
  onDelete: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  onEdit: () => void;
}) {
  const ingredientById = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])), [ingredients]);
  const calculation = useMemo(() => calculateRecipe(recipe, ingredients), [recipe, ingredients]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{recipe.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white" onClick={onEdit} type="button">
              Edit
            </button>
            <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white" onClick={() => onDuplicate(recipe)} type="button">
              Duplicate
            </button>
            {isExisting ? (
              <button
                aria-label={`Delete ${recipe.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                onClick={() => onDelete(recipe)}
                title="Delete"
                type="button"
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <Metric label="Category" value={formatCategory(recipe.purpose ?? "custom")} />
          <Metric label="Bottle" value={`${recipe.bottleVolumeMl}ml`} />
          <Metric label="Dose" value={`${recipe.doseVolumeMl}ml`} />
          <Metric label="Bottle cost" value={money(calculation.totalCost)} />
          <Metric label="Dose cost" value={money(calculation.costPerDose)} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReadOnlyPanel title="Target Compounds">
          <SimpleTable
            headers={["Compound", "Target per dose", "Target per bottle"]}
            rows={recipe.targets.map((target) => [
              target.compound,
              `${number(target.targetMgPerDose, 2)}mg`,
              `${number(target.targetMgPerDose * calculation.dosesPerBottle, 2)}mg`
            ])}
          />
        </ReadOnlyPanel>

        <ReadOnlyPanel title="Results">
          <SimpleTable
            headers={["Compound", "Actual per dose", "Status"]}
            rows={calculation.contributions.map((contribution) => [
              contribution.compound,
              `${number(contribution.actualMgPerDose, 2)}mg`,
              contribution.status
            ])}
          />
        </ReadOnlyPanel>
      </div>

      <ReadOnlyPanel title="Ingredients">
        <SimpleTable
          headers={["Ingredient", "Amount", "Cost"]}
          rows={calculation.costLines.map((line) => [
            ingredientById.get(line.ingredientProductId)?.name ?? line.ingredientName,
            `${number(line.amountUsed, 2)}${line.amountUnit}`,
            money(line.estimatedCost)
          ])}
        />
      </ReadOnlyPanel>

      {calculation.warnings.length ? (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">Warnings</div>
          <ul className="mt-1 list-disc pl-5">
            {Array.from(new Set(calculation.warnings)).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {recipe.notes ? (
        <ReadOnlyPanel title="Notes">
          <p className="text-sm text-slate-700">{recipe.notes}</p>
        </ReadOnlyPanel>
      ) : null}
    </div>
  );
}

function RecipeEditor({
  ingredients,
  recipeCategories,
  recipe,
  isSaving,
  onSave,
  onCancel
}: {
  ingredients: IngredientProduct[];
  recipeCategories: string[];
  recipe: Recipe;
  isSaving: boolean;
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(recipe);

  useEffect(() => {
    setDraft(recipe);
  }, [recipe]);

  function updateTarget(index: number, patch: Partial<RecipeTarget>) {
    setDraft((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) => (targetIndex === index ? { ...target, ...patch } : target))
    }));
  }

  function updateLine(index: number, patch: Partial<RecipeIngredientLine>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line))
    }));
  }

  const ingredientById = useMemo(() => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])), [ingredients]);
  const calculation = useMemo(() => calculateRecipe(draft, ingredients), [draft, ingredients]);
  const categoryOptions = useMemo(
    () => Array.from(new Set([draft.purpose ?? "custom", ...recipeCategories])),
    [draft.purpose, recipeCategories]
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Edit Recipe</h2>
          <p className="text-sm text-slate-500">Save keeps your changes; Cancel returns to the read-only view.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-sm" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(draft)}
            type="button"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <EditorSection title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="Name">
              <input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Label>
            <Label text="Category">
              <select className="input" value={draft.purpose ?? "custom"} onChange={(event) => setDraft({ ...draft, purpose: event.target.value as Recipe["purpose"] })}>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {formatCategory(category)}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Bottle ml">
              <input className="input" min="0" type="number" value={draft.bottleVolumeMl} onChange={(event) => setDraft({ ...draft, bottleVolumeMl: Number(event.target.value) })} />
            </Label>
            <Label text="Dose ml">
              <input className="input" min="0" type="number" value={draft.doseVolumeMl} onChange={(event) => setDraft({ ...draft, doseVolumeMl: Number(event.target.value) })} />
            </Label>
          </div>
        </EditorSection>

        <EditorSection title="Target Compounds">
          <div className="space-y-2">
            {draft.targets.map((target, index) => (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={target.id ?? index}>
                <input className="input" value={target.compound} onChange={(event) => updateTarget(index, { compound: event.target.value.toUpperCase() })} />
                <input className="input" min="0" type="number" value={target.targetMgPerDose} onChange={(event) => updateTarget(index, { targetMgPerDose: Number(event.target.value) })} />
                <button className="rounded-md bg-slate-100 px-2 text-sm" onClick={() => setDraft({ ...draft, targets: draft.targets.filter((_, targetIndex) => targetIndex !== index) })} type="button">
                  Remove
                </button>
              </div>
            ))}
            <button className="rounded-md bg-slate-100 px-3 py-1.5 text-sm" onClick={() => setDraft({ ...draft, targets: [...draft.targets, { compound: "CBD", targetMgPerDose: 0 }] })} type="button">
              Add Target
            </button>
          </div>
        </EditorSection>

        <EditorSection title="Ingredients">
          <div className="space-y-2">
            {draft.ingredients.map((line, index) => (
              <div className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_0.7fr_auto]" key={line.id ?? index}>
                <select className="input" value={line.ingredientProductId} onChange={(event) => updateLine(index, { ingredientProductId: event.target.value })}>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
                <input className="input" min="0" type="number" value={line.amount} onChange={(event) => updateLine(index, { amount: Number(event.target.value) })} />
                <UnitSelect value={line.amountUnit} onChange={(value) => updateLine(index, { amountUnit: value })} />
                <button className="rounded-md bg-slate-100 px-2 text-sm" onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, lineIndex) => lineIndex !== index) })} type="button">
                  Remove
                </button>
                <div className="text-xs text-slate-500 sm:col-span-4">
                  {ingredientById.get(line.ingredientProductId)?.activeProfile.map((profile) => `${profile.compound} ${number(profile.value * 100, 2)}%`).join(", ") || "No compound profile"}
                </div>
              </div>
            ))}
            <button
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm"
              onClick={() =>
                ingredients[0]
                  ? setDraft({ ...draft, ingredients: [...draft.ingredients, { ingredientProductId: ingredients[0].id, amount: 0, amountUnit: "mg" }] })
                  : undefined
              }
              type="button"
            >
              Add Ingredient
            </button>
          </div>
        </EditorSection>

        <EditorSection title="Results">
          <div className="grid gap-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Bottle cost" value={money(calculation.totalCost)} />
              <Metric label="Dose cost" value={money(calculation.costPerDose)} />
              <Metric label="MCT fill estimate" value={`${number(calculation.estimatedCarrierVolumeMl ?? 0, 1)}ml`} />
            </div>
          </div>
        </EditorSection>

        <EditorSection title="Notes">
          <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </EditorSection>
      </div>
    </div>
  );
}

function IngredientsListView({
  ingredients,
  onNew,
  onSelect
}: {
  ingredients: IngredientProduct[];
  onNew: () => void;
  onSelect: (ingredient: IngredientProduct) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Ingredients</h2>
          <p className="text-sm text-slate-600">Open an ingredient to view or edit its product details.</p>
        </div>
        <button className="rounded-md bg-leaf px-3 py-2 text-sm font-medium text-white" onClick={onNew} type="button">
          Add Ingredient
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Cost</th>
              <th className="px-3 py-2">Compounds</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ingredient) => (
              <tr className="cursor-pointer border-t border-slate-100 align-top hover:bg-mist/60" key={ingredient.id} onClick={() => onSelect(ingredient)}>
                <td className="px-3 py-3">
                  <div className="font-medium">{ingredient.name}</div>
                  <div className="text-xs text-slate-500">{ingredient.source || "No source"}</div>
                </td>
                <td className="px-3 py-3 capitalize">{ingredient.category.replace("_", " ")}</td>
                <td className="px-3 py-3">{costBasisText(ingredient)}</td>
                <td className="px-3 py-3">{profileSummary(ingredient)}</td>
                <td className="px-3 py-3">{ingredient.isArchived ? "Archived" : "Active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function IngredientDetailView({
  ingredient,
  isExisting,
  isSaving,
  mode,
  onBack,
  onCancel,
  onDelete,
  onEdit,
  onSave
}: {
  ingredient: IngredientProduct;
  isExisting: boolean;
  isSaving: boolean;
  mode: DetailMode;
  onBack: () => void;
  onCancel: () => void;
  onDelete: (ingredient: IngredientProduct) => void;
  onEdit: () => void;
  onSave: (ingredient: IngredientProduct) => void;
}) {
  return (
    <section>
      <BackLink label="Ingredients" onClick={onBack} />
      {mode === "edit" ? (
        <IngredientEditor ingredient={ingredient} isSaving={isSaving} onCancel={onCancel} onSave={onSave} />
      ) : (
        <IngredientReadOnly ingredient={ingredient} isExisting={isExisting} onDelete={onDelete} onEdit={onEdit} />
      )}
    </section>
  );
}

function IngredientReadOnly({
  ingredient,
  isExisting,
  onDelete,
  onEdit
}: {
  ingredient: IngredientProduct;
  isExisting: boolean;
  onDelete: (ingredient: IngredientProduct) => void;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{ingredient.name}</h2>
            <p className="mt-1 text-sm capitalize text-slate-500">{ingredient.category.replace("_", " ")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white" onClick={onEdit} type="button">
              {isExisting ? "Edit" : "Continue Editing"}
            </button>
            {isExisting ? (
              <button
                aria-label={`Delete ${ingredient.name}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                onClick={() => onDelete(ingredient)}
                title="Delete"
                type="button"
              >
                <TrashIcon />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="Source" value={ingredient.source || "Not set"} />
          <Metric label="Status" value={ingredient.isArchived ? "Archived" : "Active"} />
          <Metric label="Cost basis" value={costBasisText(ingredient)} />
          <Metric label="Density" value={ingredient.densityGPerMl ? `${ingredient.densityGPerMl}g/ml` : "Not set"} />
        </div>
      </div>

      <ReadOnlyPanel title="Compound Profile">
        <SimpleTable
          headers={["Compound", "Type", "Value", "Source"]}
          rows={ingredient.activeProfile.map((profile) => [
            profile.compound,
            profile.concentrationType.replaceAll("_", " "),
            profile.concentrationType.includes("percent") ? `${number(profile.value * 100, 2)}%` : number(profile.value, 2),
            profile.profileSource.replace("_", " ")
          ])}
        />
      </ReadOnlyPanel>

      {ingredient.notes ? (
        <ReadOnlyPanel title="Notes">
          <p className="text-sm text-slate-700">{ingredient.notes}</p>
        </ReadOnlyPanel>
      ) : null}
    </div>
  );
}

function IngredientEditor({
  ingredient,
  isSaving,
  onCancel,
  onSave
}: {
  ingredient: IngredientProduct;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (ingredient: IngredientProduct) => void;
}) {
  const [draft, setDraft] = useState(ingredient);

  useEffect(() => {
    setDraft(ingredient);
  }, [ingredient]);

  function updateProfile(index: number, patch: Partial<ActiveProfileEntry>) {
    setDraft((current) => ({
      ...current,
      activeProfile: current.activeProfile.map((profile, profileIndex) =>
        profileIndex === index ? { ...profile, ...patch } : profile
      )
    }));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Edit Ingredient</h2>
          <p className="text-sm text-slate-500">Save keeps your changes; Cancel returns to the read-only view.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md bg-slate-100 px-3 py-1.5 text-sm" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(draft)}
            type="button"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <EditorSection title="Basics">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="Name">
              <input className="input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Label>
            <Label text="Category">
              <select className="input" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as IngredientCategory })}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Source">
              <input className="input" value={draft.source ?? ""} onChange={(event) => setDraft({ ...draft, source: event.target.value })} />
            </Label>
            <Label text="Archived">
              <select className="input" value={draft.isArchived ? "yes" : "no"} onChange={(event) => setDraft({ ...draft, isArchived: event.target.value === "yes" })}>
                <option value="no">Active</option>
                <option value="yes">Archived</option>
              </select>
            </Label>
          </div>
        </EditorSection>

        <EditorSection title="Cost Basis">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="Cost type">
              <select className="input" value={draft.costBasisType} onChange={(event) => setDraft({ ...draft, costBasisType: event.target.value as CostBasisType })}>
                {costBasisTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace("_", " ")}
                  </option>
                ))}
              </select>
            </Label>

            {draft.costBasisType === "total_cost" ? (
              <>
                <Label text="Total cost">
                  <NumberInput value={draft.costTotal} onChange={(value) => setDraft({ ...draft, costTotal: value })} />
                </Label>
                <Label text="Purchased amount">
                  <NumberInput value={draft.amountPurchased} onChange={(value) => setDraft({ ...draft, amountPurchased: value })} />
                </Label>
                <Label text="Purchased unit">
                  <UnitSelect value={draft.amountUnit ?? "mg"} onChange={(value) => setDraft({ ...draft, amountUnit: value })} />
                </Label>
              </>
            ) : null}

            {draft.costBasisType === "unit_cost" ? (
              <>
                <Label text="Unit cost">
                  <NumberInput value={draft.unitCost} onChange={(value) => setDraft({ ...draft, unitCost: value })} />
                </Label>
                <Label text="Cost unit">
                  <UnitSelect value={draft.unitCostUnit ?? "g"} onChange={(value) => setDraft({ ...draft, unitCostUnit: value })} />
                </Label>
              </>
            ) : null}
          </div>
        </EditorSection>

        <EditorSection title="Density">
          <div className="grid gap-3 sm:grid-cols-2">
            <Label text="Density g/ml">
              <NumberInput value={draft.densityGPerMl} onChange={(value) => setDraft({ ...draft, densityGPerMl: value })} />
            </Label>
            <Label text="Density source">
              <SourceSelect value={draft.densitySource ?? "unknown"} onChange={(value) => setDraft({ ...draft, densitySource: value })} />
            </Label>
          </div>
        </EditorSection>

        <EditorSection title="Compound Profile">
          <div className="space-y-2">
            {draft.activeProfile.map((profile, index) => (
              <div className="grid gap-2 sm:grid-cols-[0.7fr_1fr_0.7fr_0.8fr_auto]" key={profile.id ?? index}>
                <input className="input" value={profile.compound} onChange={(event) => updateProfile(index, { compound: event.target.value.toUpperCase() })} />
                <select className="input" value={profile.concentrationType} onChange={(event) => updateProfile(index, { concentrationType: event.target.value as ConcentrationType })}>
                  {concentrationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <NumberInput value={profile.value} onChange={(value) => updateProfile(index, { value: value ?? 0 })} />
                <SourceSelect value={profile.profileSource} onChange={(value) => updateProfile(index, { profileSource: value })} />
                <button className="rounded-md bg-slate-100 px-2 text-sm" onClick={() => setDraft({ ...draft, activeProfile: draft.activeProfile.filter((_, profileIndex) => profileIndex !== index) })} type="button">
                  Remove
                </button>
              </div>
            ))}
            <button
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm"
              onClick={() =>
                setDraft({
                  ...draft,
                  activeProfile: [
                    ...draft.activeProfile,
                    { compound: "CBD", concentrationType: "percent_by_mass", value: 0, profileSource: "unknown" }
                  ]
                })
              }
              type="button"
            >
              Add Compound
            </button>
          </div>
        </EditorSection>

        <EditorSection title="Notes">
          <textarea className="input min-h-24" value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </EditorSection>
      </div>
    </div>
  );
}

function ReadOnlyPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: Array<Array<ReactNode>> }) {
  return rows.length ? (
    <div className="overflow-hidden rounded-md border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {headers.map((header) => (
              <th className="px-3 py-2" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="border-t border-slate-100" key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="px-3 py-2" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-sm text-slate-500">None yet.</p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm text-slate-600">
      <span>{text}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number | undefined; onChange: (value: number | undefined) => void }) {
  return (
    <input
      className="input"
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))}
    />
  );
}

function UnitSelect({ value, onChange }: { value: AmountUnit; onChange: (value: AmountUnit) => void }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value as AmountUnit)}>
      {amountUnits.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
}

function SourceSelect({ value, onChange }: { value: ProfileSource; onChange: (value: ProfileSource) => void }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value as ProfileSource)}>
      {profileSources.map((source) => (
        <option key={source} value={source}>
          {source.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}

function profileSummary(ingredient: IngredientProduct): string {
  if (!ingredient.activeProfile.length) return "None";

  return ingredient.activeProfile
    .map((profile) => {
      const displayValue = profile.concentrationType.includes("percent")
        ? `${number(profile.value * 100, 2)}%`
        : `${number(profile.value, 2)} ${profile.concentrationType.replaceAll("_", " ")}`;
      return `${profile.compound} ${displayValue}`;
    })
    .join(", ");
}

function formatCategory(category: string): string {
  if (category.toLowerCase() === "thc_relaxation") return "THC Relaxation";

  return category
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function costBasisText(ingredient: IngredientProduct): string {
  if (ingredient.costBasisType === "unit_cost") {
    return ingredient.unitCost !== undefined && ingredient.unitCostUnit
      ? `${money(ingredient.unitCost)} / ${ingredient.unitCostUnit}`
      : "Incomplete unit cost";
  }

  if (ingredient.costBasisType === "total_cost") {
    return ingredient.costTotal !== undefined && ingredient.amountPurchased !== undefined && ingredient.amountUnit
      ? `${money(ingredient.costTotal)} / ${number(ingredient.amountPurchased, 2)}${ingredient.amountUnit}`
      : "Incomplete total cost";
  }

  return "No cost basis";
}

function SettingsView({
  branding,
  recipeCategories,
  isSaving,
  onSaveBranding,
  onSaveRecipeCategories
}: {
  branding: AppBranding;
  recipeCategories: string[];
  isSaving: boolean;
  onSaveBranding: (branding: AppBranding) => void;
  onSaveRecipeCategories: (categories: string[]) => void;
}) {
  const [draftBranding, setDraftBranding] = useState(branding);
  const [draftCategories, setDraftCategories] = useState(recipeCategories.join("\n"));

  useEffect(() => {
    setDraftBranding(branding);
  }, [branding]);

  useEffect(() => {
    setDraftCategories(recipeCategories.join("\n"));
  }, [recipeCategories]);

  return (
    <section className="grid max-w-3xl gap-4">
      <div className="mb-1">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-slate-600">Configure app branding and recipe categories.</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">App Branding</h3>
            <p className="mt-1 text-sm text-slate-600">Customize the sidebar title, tagline, and browser tab title.</p>
          </div>
          <button
            className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSaveBranding(draftBranding)}
            type="button"
          >
            Save
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Label text="App title">
            <input
              className="input"
              value={draftBranding.title}
              onChange={(event) => setDraftBranding({ ...draftBranding, title: event.target.value })}
            />
          </Label>
          <Label text="Tagline">
            <input
              className="input"
              value={draftBranding.tagline}
              onChange={(event) => setDraftBranding({ ...draftBranding, tagline: event.target.value })}
            />
          </Label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Recipe Categories</h3>
            <p className="mt-1 text-sm text-slate-600">Enter one category value per line. Existing recipes keep their saved category value.</p>
          </div>
          <button
            className="rounded-md bg-leaf px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSaveRecipeCategories(draftCategories.split("\n"))}
            type="button"
          >
            Save
          </button>
        </div>
        <textarea
          className="input mt-4 min-h-44 font-mono"
          value={draftCategories}
          onChange={(event) => setDraftCategories(event.target.value)}
        />
      </div>
    </section>
  );
}
