export type IngredientCategory =
  | "isolate"
  | "distillate"
  | "rso"
  | "terpene_blend"
  | "carrier_oil"
  | "solvent"
  | "other";

export type AmountUnit = "mg" | "g" | "ml";

export type ConcentrationType =
  | "percent_by_mass"
  | "mg_per_g"
  | "mg_per_ml"
  | "percent_by_volume";

export type ProfileSource = "coa" | "vendor_label" | "estimate" | "unknown";

export type CostBasisType = "total_cost" | "unit_cost" | "none";

export interface ActiveProfileEntry {
  id?: string;
  ingredientProductId?: string;
  compound: string;
  concentrationType: ConcentrationType;
  value: number;
  profileSource: ProfileSource;
  notes?: string;
}

export interface IngredientProduct {
  id: string;
  name: string;
  category: IngredientCategory;
  source?: string;
  costBasisType: CostBasisType;
  costTotal?: number;
  amountPurchased?: number;
  amountUnit?: AmountUnit;
  unitCost?: number;
  unitCostUnit?: AmountUnit;
  densityGPerMl?: number;
  densitySource?: ProfileSource;
  notes?: string;
  isArchived: boolean;
  activeProfile: ActiveProfileEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipeTarget {
  id?: string;
  recipeId?: string;
  compound: string;
  targetMgPerDose: number;
}

export interface RecipeIngredientLine {
  id?: string;
  recipeId?: string;
  ingredientProductId: string;
  amount: number;
  amountUnit: AmountUnit;
  locked?: boolean;
  notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  purpose?: string;
  bottleVolumeMl: number;
  doseVolumeMl: number;
  targets: RecipeTarget[];
  ingredients: RecipeIngredientLine[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompoundContribution {
  compound: string;
  targetMgPerBottle: number;
  actualMgPerBottle: number;
  targetMgPerDose: number;
  actualMgPerDose: number;
  deltaMgPerBottle: number;
  status: "under" | "met" | "over";
}

export interface CostBreakdownLine {
  ingredientProductId: string;
  ingredientName: string;
  amountUsed: number;
  amountUnit: AmountUnit;
  estimatedCost?: number;
  warnings: string[];
}

export interface RecipeCalculationResult {
  dosesPerBottle: number;
  contributions: CompoundContribution[];
  costLines: CostBreakdownLine[];
  totalCost: number;
  costPerDose: number;
  estimatedCarrierVolumeMl?: number;
  warnings: string[];
}
