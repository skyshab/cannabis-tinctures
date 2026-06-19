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
    return amountToMl(amount, fromUnit, densityGPerMl);
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
