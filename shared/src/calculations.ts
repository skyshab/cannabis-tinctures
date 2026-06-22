import type {
  ActiveProfileEntry,
  AmountUnit,
  CompoundContribution,
  CostBreakdownLine,
  IngredientProduct,
  Recipe,
  RecipeCalculationResult,
  RecipeIngredientLine
} from "./types.js";

const MET_TOLERANCE_MG_PER_BOTTLE = 0.5;

export function roundMassMg(value: number): number {
  return Math.round(value);
}

export function roundVolumeMl(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getDosesPerBottle(bottleVolumeMl: number, doseVolumeMl: number): number {
  if (doseVolumeMl <= 0) {
    throw new Error("Dose volume must be greater than zero.");
  }

  return bottleVolumeMl / doseVolumeMl;
}

export function targetMgPerBottle(targetMgPerDose: number, dosesPerBottle: number): number {
  return targetMgPerDose * dosesPerBottle;
}

export function amountToMg(amount: number, unit: AmountUnit): number | undefined {
  if (unit === "mg") return amount;
  if (unit === "g") return amount * 1000;
  return undefined;
}

export function amountToG(amount: number, unit: AmountUnit): number | undefined {
  if (unit === "g") return amount;
  if (unit === "mg") return amount / 1000;
  return undefined;
}

export function amountToMl(
  amount: number,
  unit: AmountUnit,
  densityGPerMl?: number
): { ml?: number; warning?: string } {
  if (unit === "ml") return { ml: amount };

  const grams = amountToG(amount, unit);
  if (grams === undefined) return {};
  if (!densityGPerMl || densityGPerMl <= 0) {
    return { warning: "Missing density for mass-to-volume conversion." };
  }

  return { ml: grams / densityGPerMl };
}

export function contributionFromProfile(
  line: RecipeIngredientLine,
  product: IngredientProduct,
  profile: ActiveProfileEntry
): { compound: string; mg?: number; warning?: string } {
  const massMg = amountToMg(line.amount, line.amountUnit);
  const massG = amountToG(line.amount, line.amountUnit);

  if (profile.concentrationType === "percent_by_mass") {
    if (massMg !== undefined) {
      return { compound: profile.compound, mg: massMg * profile.value };
    }

    if (!product.densityGPerMl) {
      return {
        compound: profile.compound,
        warning: `${product.name} needs density to convert ml to mass for ${profile.compound}.`
      };
    }

    return {
      compound: profile.compound,
      mg: line.amount * product.densityGPerMl * 1000 * profile.value
    };
  }

  if (profile.concentrationType === "mg_per_g") {
    if (massG !== undefined) {
      return { compound: profile.compound, mg: massG * profile.value };
    }

    if (!product.densityGPerMl) {
      return {
        compound: profile.compound,
        warning: `${product.name} needs density to convert ml to grams for ${profile.compound}.`
      };
    }

    return {
      compound: profile.compound,
      mg: line.amount * product.densityGPerMl * profile.value
    };
  }

  if (profile.concentrationType === "mg_per_ml") {
    const volume = amountToMl(line.amount, line.amountUnit, product.densityGPerMl);
    if (volume.warning) {
      return { compound: profile.compound, warning: `${product.name}: ${volume.warning}` };
    }

    return { compound: profile.compound, mg: (volume.ml ?? 0) * profile.value };
  }

  if (profile.concentrationType === "percent_by_volume") {
    const volume = amountToMl(line.amount, line.amountUnit, product.densityGPerMl);
    if (volume.warning) {
      return { compound: profile.compound, warning: `${product.name}: ${volume.warning}` };
    }

    return { compound: profile.compound, mg: undefined };
  }

  return { compound: profile.compound, warning: `Unsupported concentration type for ${profile.compound}.` };
}

export function costForLine(
  line: RecipeIngredientLine,
  product: IngredientProduct
): { cost?: number; warnings: string[] } {
  if (product.costBasisType === "none") {
    return { warnings: [`${product.name} has no cost basis.`] };
  }

  if (product.costBasisType === "unit_cost") {
    if (product.unitCost === undefined || !product.unitCostUnit) {
      return { warnings: [`${product.name} unit cost is incomplete.`] };
    }

    const amountInCostUnit = convertUnit(line.amount, line.amountUnit, product.unitCostUnit, product.densityGPerMl);
    if (amountInCostUnit.value === undefined) {
      return { warnings: [`${product.name}: ${amountInCostUnit.warning ?? "Cannot convert cost unit."}`] };
    }

    return { cost: amountInCostUnit.value * product.unitCost, warnings: [] };
  }

  if (
    product.costTotal === undefined ||
    product.amountPurchased === undefined ||
    !product.amountUnit ||
    product.amountPurchased <= 0
  ) {
    return { warnings: [`${product.name} total cost basis is incomplete.`] };
  }

  const amountInPurchasedUnit = convertUnit(
    line.amount,
    line.amountUnit,
    product.amountUnit,
    product.densityGPerMl
  );

  if (amountInPurchasedUnit.value === undefined) {
    return { warnings: [`${product.name}: ${amountInPurchasedUnit.warning ?? "Cannot convert purchase unit."}`] };
  }

  return {
    cost: (amountInPurchasedUnit.value / product.amountPurchased) * product.costTotal,
    warnings: []
  };
}

export function convertUnit(
  amount: number,
  fromUnit: AmountUnit,
  toUnit: AmountUnit,
  densityGPerMl?: number
): { value?: number; warning?: string } {
  if (fromUnit === toUnit) return { value: amount };

  if (toUnit === "mg") {
    const mg = amountToMg(amount, fromUnit);
    if (mg !== undefined) return { value: mg };
  }

  if (toUnit === "g") {
    const g = amountToG(amount, fromUnit);
    if (g !== undefined) return { value: g };
  }

  if (toUnit === "ml") {
    const volume = amountToMl(amount, fromUnit, densityGPerMl);
    return volume.ml !== undefined ? { value: volume.ml } : { warning: volume.warning };
  }

  if (fromUnit === "ml" && (toUnit === "mg" || toUnit === "g")) {
    if (!densityGPerMl || densityGPerMl <= 0) {
      return { warning: "Missing density for volume-to-mass conversion." };
    }

    const grams = amount * densityGPerMl;
    return { value: toUnit === "g" ? grams : grams * 1000 };
  }

  return { warning: `Cannot convert ${fromUnit} to ${toUnit}.` };
}

export function calculateRecipe(
  recipe: Recipe,
  products: IngredientProduct[]
): RecipeCalculationResult {
  const productById = new Map(products.map((product) => [product.id, product]));
  const dosesPerBottle = getDosesPerBottle(recipe.bottleVolumeMl, recipe.doseVolumeMl);
  const warnings: string[] = [];
  const actualByCompound = new Map<string, number>();
  const costLines: CostBreakdownLine[] = [];
  let totalCost = 0;
  let knownVolumeMl = 0;

  for (const line of recipe.ingredients) {
    const product = productById.get(line.ingredientProductId);
    if (!product) {
      warnings.push(`Recipe references missing ingredient ${line.ingredientProductId}.`);
      continue;
    }

    if (product.category !== "isolate" && product.category !== "carrier_oil") {
      const volume = amountToMl(line.amount, line.amountUnit, product.densityGPerMl);
      if (volume.ml !== undefined) {
        knownVolumeMl += volume.ml;
      } else if (volume.warning) {
        warnings.push(`${product.name}: ${volume.warning}`);
      }
    }

    if (product.activeProfile.length === 0 && product.category !== "carrier_oil" && product.category !== "solvent") {
      warnings.push(`${product.name} has no compound profile.`);
    }

    for (const profile of product.activeProfile) {
      const contribution = contributionFromProfile(line, product, profile);
      if (contribution.warning) {
        warnings.push(contribution.warning);
        continue;
      }

      if (contribution.mg !== undefined) {
        actualByCompound.set(
          contribution.compound,
          (actualByCompound.get(contribution.compound) ?? 0) + contribution.mg
        );
      }

      if (profile.profileSource === "estimate") {
        warnings.push(`${product.name} ${profile.compound} profile is an estimate.`);
      }
    }

    const cost = costForLine(line, product);
    if (cost.cost !== undefined) totalCost += cost.cost;
    costLines.push({
      ingredientProductId: product.id,
      ingredientName: product.name,
      amountUsed: line.amount,
      amountUnit: line.amountUnit,
      estimatedCost: cost.cost,
      warnings: cost.warnings
    });
    warnings.push(...cost.warnings);
  }

  const targetCompounds = new Set(recipe.targets.map((target) => target.compound));
  for (const compound of actualByCompound.keys()) {
    targetCompounds.add(compound);
  }

  const contributions: CompoundContribution[] = Array.from(targetCompounds)
    .sort()
    .map((compound) => {
      const target = recipe.targets.find((item) => item.compound === compound);
      const targetPerDose = target?.targetMgPerDose ?? 0;
      const targetPerBottle = targetMgPerBottle(targetPerDose, dosesPerBottle);
      const actualPerBottle = actualByCompound.get(compound) ?? 0;
      const delta = actualPerBottle - targetPerBottle;
      const status =
        Math.abs(delta) <= MET_TOLERANCE_MG_PER_BOTTLE ? "met" : delta < 0 ? "under" : "over";

      return {
        compound,
        targetMgPerBottle: targetPerBottle,
        actualMgPerBottle: actualPerBottle,
        targetMgPerDose: targetPerDose,
        actualMgPerDose: actualPerBottle / dosesPerBottle,
        deltaMgPerBottle: delta,
        status
      };
    });

  const estimatedCarrierVolumeMl = roundVolumeMl(Math.max(recipe.bottleVolumeMl - knownVolumeMl, 0));

  return {
    dosesPerBottle,
    contributions,
    costLines,
    totalCost,
    costPerDose: totalCost / dosesPerBottle,
    estimatedCarrierVolumeMl,
    warnings
  };
}

export function solveMassForTargetMg(targetMg: number, potencyDecimal: number): number {
  if (potencyDecimal <= 0) {
    throw new Error("Potency must be greater than zero.");
  }

  return roundMassMg(targetMg / potencyDecimal);
}

export function solveIsolateAmountMg(targetMg: number, purityDecimal: number): number {
  return solveMassForTargetMg(targetMg, purityDecimal);
}

export function solveRsoAmountMg(targetThcMg: number, thcPotencyDecimal: number): number {
  return solveMassForTargetMg(targetThcMg, thcPotencyDecimal);
}

export interface RecipeRebalanceResult {
  recipe: Recipe;
  warnings: string[];
}

function roundRecipeAmount(value: number, unit: AmountUnit): number {
  if (unit === "mg") return roundMassMg(value);
  if (unit === "ml") return roundVolumeMl(value);
  return Math.round(value * 1000) / 1000;
}

function getTargetCompoundOrder(recipe: Recipe): string[] {
  return recipe.targets.map((target) => target.compound).filter(Boolean);
}

function contributionRatesForLine(
  line: RecipeIngredientLine,
  product: IngredientProduct,
  targetCompounds: Set<string>,
  warnings: string[]
): Map<string, number> {
  const rates = new Map<string, number>();

  for (const profile of product.activeProfile) {
    if (!targetCompounds.has(profile.compound)) continue;

    const contribution = contributionFromProfile(
      { ...line, amount: 1 },
      product,
      profile
    );
    if (contribution.warning) {
      warnings.push(contribution.warning);
      continue;
    }

    if (contribution.mg !== undefined && contribution.mg > 0) {
      rates.set(profile.compound, contribution.mg);
    }
  }

  return rates;
}

function subtractLineContributions(
  line: RecipeIngredientLine,
  product: IngredientProduct,
  remainingByCompound: Map<string, number>,
  warnings: string[]
) {
  for (const profile of product.activeProfile) {
    if (!remainingByCompound.has(profile.compound)) continue;

    const contribution = contributionFromProfile(line, product, profile);
    if (contribution.warning) {
      warnings.push(contribution.warning);
      continue;
    }

    if (contribution.mg !== undefined) {
      remainingByCompound.set(
        profile.compound,
        (remainingByCompound.get(profile.compound) ?? 0) - contribution.mg
      );
    }
  }
}

function chooseDriverCompound(
  targetOrder: string[],
  rates: Map<string, number>,
  remainingByCompound: Map<string, number>
): string | undefined {
  return (
    targetOrder.find((compound) => (rates.get(compound) ?? 0) > 0 && (remainingByCompound.get(compound) ?? 0) > MET_TOLERANCE_MG_PER_BOTTLE) ??
    targetOrder.find((compound) => (rates.get(compound) ?? 0) > 0)
  );
}

export function rebalanceRecipeIngredients(
  recipe: Recipe,
  products: IngredientProduct[]
): RecipeRebalanceResult {
  const warnings: string[] = [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const targetOrder = getTargetCompoundOrder(recipe);
  const targetCompounds = new Set(targetOrder);
  const dosesPerBottle = getDosesPerBottle(recipe.bottleVolumeMl, recipe.doseVolumeMl);
  const remainingByCompound = new Map(
    recipe.targets.map((target) => [target.compound, targetMgPerBottle(target.targetMgPerDose, dosesPerBottle)])
  );
  let ingredients = recipe.ingredients.map((line) => ({ ...line }));

  ingredients.forEach((line) => {
    const product = productById.get(line.ingredientProductId);
    if (!product) {
      warnings.push(`Recipe references missing ingredient ${line.ingredientProductId}.`);
      return;
    }

    const rates = contributionRatesForLine(line, product, targetCompounds, warnings);
    if (rates.size === 0) return;

    if (line.locked) {
      subtractLineContributions(line, product, remainingByCompound, warnings);
    }
  });

  ingredients = ingredients.map((line) => {
    if (line.locked) return line;

    const product = productById.get(line.ingredientProductId);
    if (!product) return line;

    const rates = contributionRatesForLine(line, product, targetCompounds, warnings);
    const driverCompound = chooseDriverCompound(targetOrder, rates, remainingByCompound);
    if (!driverCompound) return line;

    const rate = rates.get(driverCompound) ?? 0;
    const remainingMg = remainingByCompound.get(driverCompound) ?? 0;
    const amount = rate > 0 ? roundRecipeAmount(Math.max(remainingMg, 0) / rate, line.amountUnit) : line.amount;
    const balancedLine = { ...line, amount };
    subtractLineContributions(balancedLine, product, remainingByCompound, warnings);

    return balancedLine;
  });

  const unlockedCarrierIndexes = ingredients
    .map((line, index) => {
      const product = productById.get(line.ingredientProductId);
      return product?.category === "carrier_oil" && !line.locked ? index : -1;
    })
    .filter((index) => index >= 0);

  if (unlockedCarrierIndexes.length > 0) {
    const firstCarrierIndex = unlockedCarrierIndexes[0];
    const carrierDraft: Recipe = {
      ...recipe,
      ingredients: ingredients.map((line, index) =>
        unlockedCarrierIndexes.includes(index) ? { ...line, amount: 0, amountUnit: "ml" } : line
      )
    };
    const carrierVolumeMl = calculateRecipe(carrierDraft, products).estimatedCarrierVolumeMl ?? 0;

    ingredients = ingredients.map((line, index) => {
      if (!unlockedCarrierIndexes.includes(index)) return line;
      return {
        ...line,
        amount: index === firstCarrierIndex ? carrierVolumeMl : 0,
        amountUnit: "ml"
      };
    });
  }

  for (const [compound, remainingMg] of remainingByCompound) {
    if (remainingMg > MET_TOLERANCE_MG_PER_BOTTLE) {
      warnings.push(`${compound} is still under target by ${roundMassMg(remainingMg)}mg per bottle.`);
    } else if (remainingMg < -MET_TOLERANCE_MG_PER_BOTTLE) {
      warnings.push(`${compound} is over target by ${roundMassMg(Math.abs(remainingMg))}mg per bottle.`);
    }
  }

  return {
    recipe: {
      ...recipe,
      ingredients
    },
    warnings
  };
}
