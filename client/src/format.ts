export function money(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "Missing";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function number(value: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits
  }).format(value);
}

export function compoundSummary(targets: { compound: string; targetMgPerDose: number }[]): string {
  if (targets.length === 0) return "No target compounds";

  return targets
    .map((target) => `${target.compound} ${number(target.targetMgPerDose, 2)}mg`)
    .join(" / ");
}

