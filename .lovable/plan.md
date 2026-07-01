## Seed demo data for testing the Pre-Payment Flow

Populate the database with realistic sample data so you can walk through the patient portal flow end-to-end and exercise every admin screen.

### What gets seeded

**3 Medication Categories** (with BMI / sex / age eligibility rules)
- `weight-loss` — Weight Loss. Eligibility: BMI ≥ 27, ages 18–75, any sex.
- `hair-growth` — Hair Growth. Eligibility: any BMI, ages 18–65, male only.
- `sexual-health` — Sexual Health / ED. Eligibility: any BMI, ages 18–70, male only.

**7 Medicines** (active, priced monthly, with image, short + long description, important-info bullets, notice)
- Weight Loss: Semaglutide Compound ($299), Tirzepatide Compound ($449), Metformin ($49) — questionnaire required
- Hair Growth: Finasteride 1mg ($35), Minoxidil 5% Topical ($25) — no questionnaire
- Sexual Health: Sildenafil 50mg ($60), Tadalafil 10mg ($75) — questionnaire required

Each medicine is linked to its category via `medication_category_medicines`.

**2 Questionnaires** with questions + options
- "Weight Loss Intake" — linked to Semaglutide + Tirzepatide. Questions: current weight (number), height (number), diabetes history (yes/no), pregnant/breastfeeding (yes/no), thyroid conditions (multi-select), allergies (text).
- "ED Intake" — linked to Sildenafil + Tadalafil. Questions: heart condition (yes/no), nitrate medications (yes/no), blood pressure range (single-select), previous ED treatment (yes/no).

**Medication compatibility rules** in `medication_relationships`
- Semaglutide ↔ Tirzepatide — `incompatible` (can't select both — same drug class)
- Finasteride + Minoxidil — `recommended_with` (safe to combine)
- Sildenafil ↔ Tadalafil — `incompatible` (same class)
- Metformin + Semaglutide — `compatible`

### How

Uses the `supabase--insert` tool with a single SQL script that inserts categories → medicines → join rows → questionnaires → questions → options → questionnaire-medicine links → medication_relationships. All IDs generated with `gen_random_uuid()` and stitched via CTEs / slug lookups so re-running is safe to reason about.

Nothing is inserted into `intake_sessions`, `payments`, `profiles`, or `user_roles` — those are populated by real patient flow / auth.

### After seeding

You'll be able to:
- Browse/edit all 3 categories, 7 medicines, 2 questionnaires, and 4 compatibility rules in the admin portal
- Test the patient pre-payment flow with real category → medicine → questionnaire branching
- Verify BMI-based eligibility filtering (e.g. BMI 25 hides Weight Loss)
- Verify incompatibility rules block selecting Semaglutide + Tirzepatide together
