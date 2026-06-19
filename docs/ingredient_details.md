# Tinctura — Ingredient Details and Cost Notes

## Purpose of this document

This document captures the ingredient products and ingredient categories already discussed for the tincture blend project. It is meant to seed the app's ingredient database and guide the data model.

The most important modeling requirement is that an ingredient product can contain multiple active compounds. Full-spectrum distillates, RSO, and terpene blends are not always single-active ingredients.

## Current known product costs

### Cannabinoid isolates bundle

Known purchase/cost information:

- Combo pack: 1000mg CBD isolate + 1000mg CBG isolate + 1000mg CBN isolate for $50 total.
- Individual regular prices discussed:
  - CBD isolate: $10 per 1000mg.
  - CBG isolate: $20 per 1000mg.
  - CBN isolate: $30 per 1000mg.

Cost basis options:

| Item | Amount | Bundle-implied cost | Individual cost | Notes |
|---|---:|---:|---:|---|
| CBD isolate | 1000mg | $16.67 if split evenly | $10.00 | Use individual cost if modeling actual standalone replacement cost. |
| CBG isolate | 1000mg | $16.67 if split evenly | $20.00 | User wants to use full 1000mg package in planned blends. |
| CBN isolate | 1000mg | $16.67 if split evenly | $30.00 | User only has 1000mg and adjusted recipes to avoid needing more. |
| Total bundle | 3000mg | $50.00 | $60.00 separately | Actual paid bundle price was $50. |

Recommendation for v1:

- Store both `actual_purchase_cost` and `replacement_cost` if useful.
- Use actual purchase cost for current batch costing.
- Use replacement cost for future recipe planning.

### CBD / full-spectrum distillate

Known product:

- Fern Valley Farms CBD distillate syringe.
- 10ml for $65.
- Marketed as non-crystallizing and suitable for vaping.
- Contains CBD plus secondary cannabinoids and terpenes.
- Exact cannabinoid profile must be entered from product COA/lab details when available.

Cost basis:

```text
$65 / 10ml = $6.50 per ml
```

Important app behavior:

- Distillate should not be modeled as pure CBD unless no lab data is available.
- It may contribute CBD, CBG, CBN, and terpenes.
- Secondary CBG/CBN contributions should reduce the amount of isolate needed.

### Local RSO / THC extract

Known product:

- Locally sourced RSO.
- Approximately 80% THC.
- Cost: about $8 per gram.
- Very thick, molasses-like consistency.
- Warms/thins somewhat, but remains too thick for a standard dropper.
- Stored in a jar too large for the user's scale tare capacity.

Cost/potency basis:

```text
1g RSO = 1000mg material
80% THC = 800mg THC per gram
$8 / 800mg THC = $0.01 per mg THC
```

Example:

```text
300mg THC target requires 300 / 0.80 = 375mg RSO
375mg RSO costs 0.375g * $8/g = $3.00
```

Handling notes:

- Measure by mass when possible.
- Warm gently for handling.
- Use an intermediate lightweight container if the tincture bottle or RSO jar exceeds scale tare.
- A solid glass rod applicator can help transfer sticky extracts, but final measurement should be by weight.

### Terpene blends

Known source explored:

- Lab Effects terpene blends.
- Example product mentioned: Lemon Haze cannabis-derived terpene.
- Vendor recommendation noted: 1.5% in tinctures.
- User prefers starting at 1.0%.
- Terpenes are added on top of any terpenes already present in RSO or full-spectrum distillate.

Recipe convention:

```text
1% of 30ml bottle = 0.30ml terpene blend
1.5% of 30ml bottle = 0.45ml terpene blend
```

Important app behavior:

- Terpene percentage should be calculated against final bottle volume unless the user chooses otherwise.
- Terpenes already present in distillate should be tracked as part of the source ingredient profile, but may be difficult to quantify without COA.
- The UI should warn that terpenes are potent and should be tested conservatively.

### Carrier oil

Likely carrier:

- MCT oil.

Role:

- Fill remaining volume after active ingredients and terpenes are added.
- Improve oral/sublingual tincture usability.

Modeling notes:

- Carrier oil cost should be tracked for complete cost-per-bottle math.
- Carrier volume should be calculated as the remaining volume to reach 30ml.
- If active ingredients are measured by mass and not volume, density assumptions may be needed to estimate displacement.

### Everclear / ethanol

Discussed as a possible solvent/thinner.

Known density approximation:

- High-proof ethanol is lighter than water.
- For practical recipe calculations, Everclear can be approximated around 0.79–0.81 g/ml depending on proof and water content.

V1 recommendation:

- Treat ethanol as an optional ingredient.
- Store density if the app needs mass-to-volume conversion.
- Do not assume ethanol is required for all recipes.

## Ingredient categories for the app

### Isolate

Examples:

- CBD isolate
- CBG isolate
- CBN isolate
- CBC isolate
- THCA isolate, if later added

Data fields:

- Compound name
- Purity percentage
- Amount available
- Cost
- Vendor/source
- Notes

Example default potency:

```json
{
  "CBD isolate": { "CBD": 0.99 },
  "CBG isolate": { "CBG": 0.99 },
  "CBN isolate": { "CBN": 0.99 }
}
```

Use actual COA values when available. If not available, v1 can default to 99% for isolates but should label it as an assumption.

### Distillate

Examples:

- Full-spectrum CBD distillate
- THC distillate
- Minor cannabinoid distillates

Data fields:

- Volume or mass purchased
- Cost
- Density, optional
- Cannabinoid profile by percentage
- Terpene profile by percentage, optional
- Vendor/source
- Batch/COA link or notes

### RSO / full-spectrum extract

Examples:

- Local ~80% THC RSO

Data fields:

- Mass purchased
- Cost
- Cannabinoid profile
- Solvent/extract type, optional
- Texture/handling notes
- Batch/COA notes

### Terpene blend

Examples discussed as useful categories:

- Bubba Kush-style relaxing terpene profile
- Lemon Haze-style uplifting terpene profile
- Other strain-inspired profiles from Lab Effects

Data fields:

- Blend name
- Vendor/source
- Type: cannabis-derived, botanical-derived, or unknown
- Cost
- Amount purchased
- Suggested use rate
- User preferred use rate
- Flavor/effect notes

### Carrier / solvent

Examples:

- MCT oil
- Ethanol/Everclear, optional

Data fields:

- Cost
- Amount purchased
- Density, optional
- Notes

## Specific cannabinoids and planning notes

### CBD

Role in blends:

- Main base cannabinoid for focus, relaxation, and sleep recipes.
- Used to make THC blends more CBD-forward and less edgy.

Known targets:

- Focus blend likely around 50mg CBD per 1ml dropper.
- Relaxation blend target: 75mg CBD per 1ml dropper.
- Sleep blend likely CBD-forward with CBN; exact CBD target should be confirmed.

### CBG

Role in blends:

- Used in focus blend with CBD.
- Used in relaxation blend at lower dose.
- User wants to use up the full 1000mg CBG isolate across the planned recipes if possible.

Known targets:

- Focus blend: 25mg CBG per 1ml dropper.
- Relaxation blend: initially 12.5mg CBG per 1ml dropper, with possible extra CBG added to use full package.
- Sleep blend: no intentional CBG, but may receive minor CBG from distillate.

### CBN

Role in blends:

- Used for relaxation and sleep.
- More prominent in sleep blend.
- User has only 1000mg CBN isolate and specifically wanted recipes adjusted to avoid needing more.

Known targets:

- Relaxation blend: initially 12.5mg CBN per 1ml dropper, later adjusted downward so total CBN isolate across recipes is 1000mg.
- Sleep blend: 25mg CBN per 1ml dropper.

### CBC

Status:

- Discussed as potentially interesting but expensive.
- User saw price around $90 for 10g.
- Not yet part of confirmed recipes.

App status:

- Include as possible ingredient type.
- Do not include in v1 seed recipes unless user confirms.

### THC / RSO

Role in blends:

- Used for an evening THC relaxation blend.
- Goal is a CBD-forward head-change/social relaxation option that can replace smoking/vaping.
- User has high cannabis tolerance, but higher edibles can cause anxiety.

Known response:

- 20mg edible THC minimal.
- 40–50mg edible THC effective.
- Higher doses can cause anxiety.

Prototype direction:

- Add THC carefully to the CBD/CBG/CBN relaxation base.
- Useful starting targets might include 10mg, 15mg, 20mg, or 25mg THC per 1ml dropper, but final target should be chosen cautiously.

## Measurement and data model cautions

### Mass vs volume

Do not freely interchange grams and milliliters.

- Water is approximately 1g/ml.
- MCT oil is usually less dense than water.
- Ethanol is less dense than water.
- Distillates and RSO vary and may be closer to or heavier than 1g/ml.

For calculation accuracy, store both:

- Mass-based potency: mg active per g product.
- Volume-based potency: mg active per ml product.

The app should support either form and clearly indicate assumptions.

### Scale/tare issue

The user's scale cannot tare heavy containers like the RSO jar or sometimes the tincture bottle.

Practical workaround to support in app notes:

1. Weigh a lightweight intermediate container.
2. Transfer extract into it.
3. Weigh again.
4. Difference is extract mass.
5. Transfer into final mixing container.

## Suggested seed ingredient records

These are not final database rows, but are useful starting records.

```yaml
- name: CBD Isolate
  category: isolate
  source: TBD
  amount_purchased_mg: 1000
  cost_actual_bundle_share: 16.67
  cost_replacement: 10.00
  active_profile:
    CBD: 0.99
  notes: Assumed 99% purity unless COA says otherwise.

- name: CBG Isolate
  category: isolate
  source: TBD
  amount_purchased_mg: 1000
  cost_actual_bundle_share: 16.67
  cost_replacement: 20.00
  active_profile:
    CBG: 0.99
  notes: User wants to use full 1000mg package in current recipe set.

- name: CBN Isolate
  category: isolate
  source: TBD
  amount_purchased_mg: 1000
  cost_actual_bundle_share: 16.67
  cost_replacement: 30.00
  active_profile:
    CBN: 0.99
  notes: User only has 1000mg and wants recipe set adjusted to fit this limit.

- name: Fern Valley Farms Full-Spectrum CBD Distillate
  category: distillate
  source: Fern Valley Farms
  amount_purchased_ml: 10
  cost_actual: 65.00
  active_profile:
    CBD: TBD
    CBG: TBD
    CBN: TBD
    terpenes: TBD
  notes: Non-crystallizing; suitable for vaping; includes minor cannabinoids and terpenes. Enter COA values when available.

- name: Local RSO
  category: RSO
  source: local
  cost_per_g: 8.00
  active_profile:
    THC: 0.80
  notes: Very thick/molasses-like; warm gently; measure by mass. Approximate potency 80% THC.

- name: Lab Effects Terpene Blend
  category: terpene_blend
  source: Lab Effects
  suggested_use_rate_percent: 1.5
  preferred_starting_rate_percent: 1.0
  notes: Use 1% starting point in tinctures; added on top of terpenes already present in RSO/distillate.
```
