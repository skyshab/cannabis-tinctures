import { describe, expect, it } from "vitest";
import {
  calculateRecipe,
  costForLine,
  getDosesPerBottle,
  solveIsolateAmountMg,
  solveRsoAmountMg,
  targetMgPerBottle
} from "./calculations";
import type { IngredientProduct, Recipe } from "./types.js";

const now = "2026-06-18T00:00:00.000Z";

const cbd: IngredientProduct = {
  id: "cbd",
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

  it("calculates recipe contributions and carrier volume", () => {
    const recipe: Recipe = {
      id: "recipe",
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
});
