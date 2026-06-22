import { describe, expect, it } from "vitest";
import {
  calculateRecipe,
  costForLine,
  getDosesPerBottle,
  rebalanceRecipeIngredients,
  solveIsolateAmountMg,
  solveRsoAmountMg,
  targetMgPerBottle
} from "./calculations";
import type { IngredientProduct, Recipe } from "./types.js";

const now = "2026-06-18T00:00:00.000Z";

const cbd: IngredientProduct = {
  id: "cbd",
  permalink: "cbd-isolate",
  name: "CBD Isolate",
  category: "isolate",
  costBasisType: "total_cost",
  costTotal: 63.87,
  amountPurchased: 20000,
  amountUnit: "mg",
  notes: "",
  isArchived: false,
  activeProfile: [
    {
      compound: "CBD",
      concentrationType: "percent_by_mass",
      value: 0.98,
      profileSource: "estimate"
    }
  ],
  createdAt: now,
  updatedAt: now
};

const rso: IngredientProduct = {
  id: "rso",
  permalink: "local-rso",
  name: "Local RSO",
  category: "rso",
  costBasisType: "unit_cost",
  unitCost: 8,
  unitCostUnit: "g",
  densityGPerMl: 1,
  densitySource: "estimate",
  notes: "",
  isArchived: false,
  activeProfile: [
    {
      compound: "THC",
      concentrationType: "percent_by_mass",
      value: 0.8,
      profileSource: "estimate"
    }
  ],
  createdAt: now,
  updatedAt: now
};

describe("calculation helpers", () => {
  it("calculates doses per bottle", () => {
    expect(getDosesPerBottle(30, 1)).toBe(30);
  });

  it("calculates target mg per bottle", () => {
    expect(targetMgPerBottle(25, 30)).toBe(750);
  });

  it("solves isolate amounts using purity", () => {
    expect(solveIsolateAmountMg(1500, 0.98)).toBe(1531);
  });

  it("solves RSO amount from THC potency", () => {
    expect(solveRsoAmountMg(750, 0.8)).toBe(938);
  });

  it("calculates direct unit cost", () => {
    const result = costForLine({ ingredientProductId: "rso", amount: 938, amountUnit: "mg" }, rso);

    expect(result.cost).toBeCloseTo(7.504);
  });

  it("calculates total cost when recipe mass is purchased by volume", () => {
    const distillate: IngredientProduct = {
      id: "distillate",
      permalink: "full-spectrum-distillate",
      name: "Full-Spectrum Distillate",
      category: "distillate",
      costBasisType: "total_cost",
      costTotal: 65,
      amountPurchased: 10,
      amountUnit: "ml",
      densityGPerMl: 1,
      densitySource: "estimate",
      notes: "",
      isArchived: false,
      activeProfile: [],
      createdAt: now,
      updatedAt: now
    };

    const result = costForLine({ ingredientProductId: "distillate", amount: 2506, amountUnit: "mg" }, distillate);

    expect(result.cost).toBeCloseTo(16.289);
    expect(result.warnings).toEqual([]);
  });

  it("calculates recipe contributions and carrier volume", () => {
    const recipe: Recipe = {
      id: "recipe",
      permalink: "thc-relaxation",
      name: "THC Relaxation",
      purpose: "thc_relaxation",
      bottleVolumeMl: 30,
      doseVolumeMl: 1,
      targets: [
        { compound: "CBD", targetMgPerDose: 75 },
        { compound: "THC", targetMgPerDose: 25 }
      ],
      ingredients: [
        { ingredientProductId: "cbd", amount: 2296, amountUnit: "mg" },
        { ingredientProductId: "rso", amount: 938, amountUnit: "mg" }
      ],
      createdAt: now,
      updatedAt: now
    };

    const result = calculateRecipe(recipe, [cbd, rso]);

    expect(result.contributions.find((item) => item.compound === "CBD")?.actualMgPerBottle).toBeCloseTo(2250.08);
    expect(result.contributions.find((item) => item.compound === "THC")?.actualMgPerBottle).toBeCloseTo(750.4);
    expect(result.estimatedCarrierVolumeMl).toBe(29.1);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it("rebalances isolate amounts around a multi-compound distillate", () => {
    const cbg: IngredientProduct = {
      id: "cbg",
      permalink: "cbg-isolate",
      name: "CBG Isolate",
      category: "isolate",
      costBasisType: "none",
      notes: "",
      isArchived: false,
      activeProfile: [
        {
          compound: "CBG",
          concentrationType: "percent_by_mass",
          value: 0.95,
          profileSource: "estimate"
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    const cbn: IngredientProduct = {
      id: "cbn",
      permalink: "cbn-isolate",
      name: "CBN Isolate",
      category: "isolate",
      costBasisType: "none",
      notes: "",
      isArchived: false,
      activeProfile: [
        {
          compound: "CBN",
          concentrationType: "percent_by_mass",
          value: 0.96,
          profileSource: "estimate"
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    const distillate: IngredientProduct = {
      id: "distillate",
      permalink: "full-spectrum-distillate",
      name: "Full-Spectrum Distillate",
      category: "distillate",
      costBasisType: "none",
      densityGPerMl: 1,
      densitySource: "estimate",
      notes: "",
      isArchived: false,
      activeProfile: [
        {
          compound: "CBD",
          concentrationType: "percent_by_mass",
          value: 0.75,
          profileSource: "estimate"
        },
        {
          compound: "CBG",
          concentrationType: "percent_by_mass",
          value: 0.05,
          profileSource: "estimate"
        },
        {
          compound: "CBN",
          concentrationType: "percent_by_mass",
          value: 0.025,
          profileSource: "estimate"
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    const recipe: Recipe = {
      id: "recipe",
      permalink: "distillate-relaxation",
      name: "THC Distillate Relaxation",
      purpose: "thc_relaxation",
      bottleVolumeMl: 30,
      doseVolumeMl: 1,
      targets: [
        { compound: "CBD", targetMgPerDose: 75 },
        { compound: "CBG", targetMgPerDose: 10 },
        { compound: "CBN", targetMgPerDose: 5 },
        { compound: "THC", targetMgPerDose: 25 }
      ],
      ingredients: [
        { ingredientProductId: "distillate", amount: 2296, amountUnit: "mg" },
        { ingredientProductId: "cbg", amount: 306, amountUnit: "mg" },
        { ingredientProductId: "cbn", amount: 153, amountUnit: "mg" },
        { ingredientProductId: "rso", amount: 938, amountUnit: "mg" }
      ],
      createdAt: now,
      updatedAt: now
    };

    const balanced = rebalanceRecipeIngredients(recipe, [distillate, cbg, cbn, rso]).recipe;
    const result = calculateRecipe(balanced, [distillate, cbg, cbn, rso]);

    expect(balanced.ingredients.find((line) => line.ingredientProductId === "distillate")?.amount).toBe(3000);
    expect(balanced.ingredients.find((line) => line.ingredientProductId === "cbg")?.amount).toBe(158);
    expect(balanced.ingredients.find((line) => line.ingredientProductId === "cbn")?.amount).toBe(78);
    expect(result.contributions.find((item) => item.compound === "CBD")?.status).toBe("met");
    expect(result.contributions.find((item) => item.compound === "CBG")?.actualMgPerBottle).toBeCloseTo(300.1);
    expect(result.contributions.find((item) => item.compound === "CBN")?.actualMgPerBottle).toBeCloseTo(149.88);
  });
});
