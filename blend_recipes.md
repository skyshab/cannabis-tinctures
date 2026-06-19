# Hemp Project — Blend Recipes and Tincture Concepts

## Purpose of this document

This document captures the tincture blend concepts already developed in the project. These are recipe-planning notes, not final medical or dosing instructions.

The app should allow these recipes to be entered, duplicated, revised, and recalculated using actual product potencies and costs.

## General recipe assumptions

Default bottle size:

```text
30ml
```

Default dose size:

```text
1ml = 1 full dropper
```

Default doses per bottle:

```text
30 doses
```

Formula:

```text
mg per bottle = mg per 1ml dose * 30
```

## Important modeling note

Some recipes may use full-spectrum distillate that already contains multiple cannabinoids. If a distillate contributes CBD plus minor CBG/CBN, those CBG/CBN amounts should be counted toward the recipe target automatically.

The app should show both:

- Target amount per cannabinoid.
- Actual amount provided by the selected ingredient set.

It should also show deficits and overages.

## Blend 1: Focus CBD/CBG Blend

### Intent

A daytime focus blend for relaxed mental clarity without CBN sedation.

### Target effect profile

- Clearer focus.
- Less anxious edge.
- No intentional sleepiness.
- Useful post-lunch or workday support.

### Per-dose target

| Compound | Target per 1ml dropper | Target per 30ml bottle |
|---|---:|---:|
| CBD | 50mg assumed baseline | 1500mg |
| CBG | 25mg | 750mg |
| CBN | 0mg | 0mg |
| THC | 0mg intentional | 0mg intentional |

Note: The CBG target of 25mg/dropper was explicitly selected. The CBD value of 50mg/dropper is the working baseline from earlier planning and should be confirmed in v1.

### Candidate ingredients

- CBD isolate and/or full-spectrum CBD distillate.
- CBG isolate.
- MCT oil carrier.
- Optional uplifting terpene blend at 1%, but not required for v1.

### App calculation requirement

If full-spectrum CBD distillate contains some CBG, subtract that CBG contribution from the needed CBG isolate amount.

### Notes

This blend should intentionally avoid CBN. If a full-spectrum product contributes trace CBN, show it as an incidental contribution/overage.

## Blend 2: Relaxation CBD/CBG/CBN Blend

### Intent

A post-work relaxation blend for winding down without being a heavy sleep formula.

### Target effect profile

- Relaxed body/mind.
- Less stimulation after work.
- Mildly calming but still functional.
- Potential base for a non-smoking evening routine.

### Original per-dose target

| Compound | Target per 1ml dropper | Target per 30ml bottle |
|---|---:|---:|
| CBD | 75mg | 2250mg |
| CBG | 12.5mg | 375mg |
| CBN | 12.5mg original target | 375mg original target |
| THC | 0mg intentional | 0mg intentional |

### Adjusted CBN constraint

The user only has 1000mg of CBN isolate total and wanted the full set of planned recipes adjusted to fit the available 1000mg instead of buying more.

Working constraint:

- Sleep blend uses 25mg CBN/dropper = 750mg CBN per 30ml bottle.
- Remaining CBN isolate for relaxation blend = 250mg.
- Relaxation CBN adjusted target = 250mg / 30 = 8.33mg CBN/dropper.

Adjusted target:

| Compound | Target per 1ml dropper | Target per 30ml bottle |
|---|---:|---:|
| CBD | 75mg | 2250mg |
| CBG | 12.5mg or more | 375mg or more |
| CBN | 8.33mg adjusted | 250mg |

### CBG use-up constraint

The user also wanted to use the full 1000mg CBG isolate across the current recipe set.

Known CBG use:

- Focus blend CBG: 25mg/dropper * 30 = 750mg.
- Relaxation blend original CBG: 12.5mg/dropper * 30 = 375mg.
- Total would be 1125mg, which exceeds the 1000mg CBG isolate package.

Possible approaches:

1. Keep Focus CBG at 25mg/dropper and set Relaxation CBG to remaining 250mg per bottle:

```text
250mg / 30 = 8.33mg CBG/dropper
```

2. Keep Relaxation CBG at 12.5mg/dropper and reduce Focus CBG:

```text
1000mg total - 375mg relaxation = 625mg focus
625mg / 30 = 20.83mg CBG/dropper
```

3. Allow distillate minor CBG to contribute and calculate the exact isolate amount after selecting products.

Recommended v1 behavior:

- Do not hard-code one answer.
- Let the user enter package constraints and have the app show whether the recipe set exceeds available CBG/CBN inventory.
- For seed recipe, use Focus CBG 25mg/dropper and Relaxation CBG 8.33mg/dropper if the goal is to stay within exactly 1000mg total CBG isolate.

### Candidate ingredients

- CBD isolate and/or full-spectrum CBD distillate.
- CBG isolate.
- CBN isolate.
- Bubba Kush-style terpene blend at 1%.
- MCT oil carrier.

### Terpene choice

Bubba Kush-style profile was previously selected for relaxation.

Terpene addition:

```text
1% of 30ml = 0.30ml terpenes
```

Note: This is added on top of whatever terpenes exist in RSO or full-spectrum distillate.

## Blend 3: Sleep CBD/CBN Blend

### Intent

A sleep-oriented blend with CBD and CBN, without intentional CBG.

### Target effect profile

- Heavier evening relaxation.
- Support sleep onset and staying settled.
- Avoid melatonin-style wakeup issues.

### Per-dose target

| Compound | Target per 1ml dropper | Target per 30ml bottle |
|---|---:|---:|
| CBD | TBD / CBD-forward | TBD |
| CBN | 25mg | 750mg |
| CBG | 0mg intentional | 0mg intentional |
| THC | 0mg intentional | 0mg intentional |

The CBN value of 25mg/dropper was explicitly chosen. The exact CBD target should be confirmed for v1; likely candidates are 50mg or 75mg per dropper.

### Candidate ingredients

- CBD isolate and/or full-spectrum CBD distillate.
- CBN isolate.
- MCT oil carrier.
- Optional relaxing terpene profile at 1%.

### Distillate note

The user wanted to use a mix of distillate and isolate for the sleep blend because only 1000mg CBN isolate is available. If the CBD distillate contributes minor CBN, the app should count it toward the 750mg target.

## Blend 4: THC Relaxation Blend / RSO Prototype

### Intent

An evening THC-containing tincture blend that can replace or reduce smoking/vaping while keeping the experience CBD-forward and less anxiety-prone.

### User THC context

- Long history of cannabis smoking.
- High tolerance.
- Edibles: 20mg THC is minimal; 40–50mg is effective; higher doses can cause anxiety.
- Wants a relaxing/social head-change without anxiety.
- Wants 1–2 droppers to replace evening CBD plus 1–2 joints.

### Base formula concept

Start from the Relaxation CBD/CBG/CBN base:

| Compound | Base target per 1ml dropper |
|---|---:|
| CBD | 75mg |
| CBG | 8.33–12.5mg depending on inventory constraint |
| CBN | 8.33mg adjusted or 12.5mg original |
| THC | TBD |

Then add THC from local RSO.

### THC target options for prototype

Because the user responds to 40–50mg edibles but wants lower anxiety, the app should support multiple prototype strengths.

Suggested recipe variants:

| Variant | THC per 1ml dropper | THC per 30ml bottle | RSO required at 80% THC | Approx RSO cost at $8/g |
|---|---:|---:|---:|---:|
| Very light | 5mg | 150mg | 187.5mg RSO | $1.50 |
| Light | 10mg | 300mg | 375mg RSO | $3.00 |
| Moderate | 15mg | 450mg | 562.5mg RSO | $4.50 |
| Strong | 20mg | 600mg | 750mg RSO | $6.00 |
| Very strong | 25mg | 750mg | 937.5mg RSO | $7.50 |

Formula:

```text
RSO mg required = target THC mg / 0.80
RSO cost = RSO grams * $8
```

Recommendation:

- The app should allow prototype variants to be duplicated from one base recipe.
- V1 should not assume one THC target.
- The UI should clearly show total THC per bottle and per dose.

### Terpene option

Possible terpene addition:

```text
1% = 0.30ml per 30ml bottle
```

Caution:

- RSO may already contain strain compounds/terpenes.
- Added terpene blend should be conservative.

## Ingredient cost formulas

### Isolate cost using individual replacement prices

```text
CBD: $10 / 1000mg = $0.0100 per mg
CBG: $20 / 1000mg = $0.0200 per mg
CBN: $30 / 1000mg = $0.0300 per mg
```

### Isolate cost using actual bundle split evenly

```text
$50 / 3000mg = $0.01667 per mg across CBD/CBG/CBN
```

### CBD distillate cost

```text
$65 / 10ml = $6.50 per ml
```

Exact cost per mg CBD depends on potency/COA.

### RSO cost

```text
$8 / gram material
80% THC = 800mg THC per gram
$0.01 per mg THC
```

## Example cost estimates, excluding carrier oil and terpenes

These are rough ingredient-active estimates using individual isolate replacement prices and assuming isolates supply the listed targets. They do not include CBD distillate unless specifically chosen.

### Focus blend

Assuming 50mg CBD/dropper and 25mg CBG/dropper:

```text
CBD: 1500mg * $0.0100 = $15.00
CBG: 750mg * $0.0200 = $15.00
Estimated active cost = $30.00 per 30ml bottle
Cost per 1ml dose = $1.00
```

### Relaxation blend, original 12.5mg CBG/CBN

```text
CBD: 2250mg * $0.0100 = $22.50
CBG: 375mg * $0.0200 = $7.50
CBN: 375mg * $0.0300 = $11.25
Estimated active cost = $41.25 per 30ml bottle
Cost per 1ml dose = $1.38
```

### Relaxation blend, adjusted 8.33mg CBG/CBN

```text
CBD: 2250mg * $0.0100 = $22.50
CBG: 250mg * $0.0200 = $5.00
CBN: 250mg * $0.0300 = $7.50
Estimated active cost = $35.00 per 30ml bottle
Cost per 1ml dose = $1.17
```

### Sleep blend

Assuming 75mg CBD/dropper and 25mg CBN/dropper:

```text
CBD: 2250mg * $0.0100 = $22.50
CBN: 750mg * $0.0300 = $22.50
Estimated active cost = $45.00 per 30ml bottle
Cost per 1ml dose = $1.50
```

If CBD target is 50mg/dropper instead:

```text
CBD: 1500mg * $0.0100 = $15.00
CBN: 750mg * $0.0300 = $22.50
Estimated active cost = $37.50 per 30ml bottle
Cost per 1ml dose = $1.25
```

### THC RSO add-on cost

Add this to the relaxation base depending on THC strength:

```text
10mg THC/dropper = $3.00 RSO per bottle
15mg THC/dropper = $4.50 RSO per bottle
20mg THC/dropper = $6.00 RSO per bottle
25mg THC/dropper = $7.50 RSO per bottle
```

## Open recipe questions for v1

The next agent should clarify these before hard-coding seed recipes:

1. Should Focus CBD be 50mg/dropper, 75mg/dropper, or configurable?
2. Should Sleep CBD be 50mg/dropper or 75mg/dropper?
3. Should recipe constraints prioritize using exactly 1000mg CBG/CBN packages, or should each recipe retain ideal ratios even if it requires more material?
4. Should CBD distillate be used as the main CBD source in all blends, or only where its minor cannabinoids/terpenes are desired?
5. What THC target should the first RSO prototype use?
6. Should terpene cost and volume be included in v1 calculations?
