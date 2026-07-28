## Goal
A category can be linked to exactly one questionnaire. Today the link table is many-to-many, and 3 categories (Recovery, Nasal, Growth) are each linked to 2 questionnaires.

## What changes

1. **Clean up existing duplicates**
   For each category linked to more than one questionnaire, keep the link to the most recently updated questionnaire and remove the older link. (Recovery, Nasal, Growth — each keeps one.) Nothing else is deleted; the questionnaires themselves stay.

2. **Database rule**
   Add a uniqueness rule on the category column of the questionnaire↔category link table, so the database itself rejects a second questionnaire claiming the same category.

3. **Admin UI — New questionnaire & Edit questionnaire pages**
   - Load which categories are already taken (and by which questionnaire).
   - Show taken categories greyed out/disabled with a small "Used by <questionnaire name>" note; the current questionnaire's own categories stay selectable on the edit page.
   - Map the database uniqueness error to a friendly toast: "<Category> is already linked to another questionnaire."

4. **Questionnaires list page**
   Show the linked category name(s) per row so the 1:1 mapping is visible at a glance (only if not already shown).

## Technical notes
- Migration: delete offending rows in `questionnaire_categories`, then `ALTER TABLE public.questionnaire_categories ADD CONSTRAINT questionnaire_categories_category_unique UNIQUE (category_id);`
- `src/lib/questionnaires.store.ts`: add a `listCategoryLinks()` helper returning `{ category_id, questionnaire_id, questionnaire_name }`; keep `syncQuestionnaireCategories` but surface constraint violations (Postgres code `23505`) as readable messages.
- `admin.questionnaires.new.tsx` and `admin.questionnaires.$questionnaireId.tsx`: disable checkboxes for taken categories using that helper.
