# Product Registration UX Implementation Plan

> **For Codex CLI:** execute this plan phase by phase, keep the checkboxes updated, and stop after each phase for manual approval. Do not push `main`: this repository may deploy production from `main`.

**Goal:** Replace the oversized product off-canvas with a full-width, reliable product registration experience, then improve its information architecture, variants workflow, validation, and mobile usability without changing product business rules.

**Architecture:** Keep `ProductsManager` responsible for the listing. Extract the product editor and its reusable form state into dedicated components/hooks, exposed through `/admin/products/new` and `/admin/products/[id]/edit`. Reuse the existing admin APIs and preserve upload cleanup, category-driven fields, variant normalization, margin preview, inventory totals, and current payload semantics.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 5, Zod, Node test runner with `tsx`.

---

## 1. Context and Current UX

The customer manager renders its form inside the normal page flow, using the available content width and native page scrolling. Product creation and editing currently open a fixed off-canvas in `app/admin/products/ProductsManager.tsx`, limited to `max-w-3xl`, with its own internal scroll area.

The product form is too complex for a drawer. It includes basic data, prices, calculated values, category-dependent behavior, image upload/reordering, shipping data, fashion attributes, one or more variants, expiry, stock, and publication flags. The narrow panel and nested scrolling make completion slower and make it harder to understand where the user is in the form.

## 2. Scope

### In scope

- Full-page routes for product creation and editing.
- Preservation of all current product fields and business behavior.
- Reuse of existing create, update, upload, and cleanup APIs.
- Clear grouping into basic data, prices/logistics, images, inventory/variants, and publication.
- Improved required-field and server-error feedback.
- Unsaved-change protection.
- Responsive behavior designed explicitly for phones and small tablets.
- Automated coverage for extracted pure form rules where practical.

### Out of scope

- Database or Prisma schema changes.
- Changes to storefront product pages, checkout, PDV, or integrations API.
- New product attributes or new inventory rules.
- Image editing/cropping.
- Autosave to the server or draft products.
- A mandatory step-by-step wizard that prevents experienced users from navigating freely.
- Redesign of the entire admin panel.

## 3. UX Principles

- Use normal page scrolling; no product form inside a drawer or modal.
- Select subcategory early because it controls weight, gender, variant, stock, and expiry fields.
- Keep primary business fields visible and move technical fields such as slug into an advanced area.
- Prefer one continuous form with clear sections and optional anchor navigation over a blocking wizard.
- Keep Save and Cancel available without requiring a long scroll.
- Display validation close to the affected field and provide an error summary at the top.
- Preserve typed values when validation or an API request fails.
- Use the same form component for create and edit to avoid behavior drift.

## 4. Target Routes and Files

### Routes

- `/admin/products` — listing only.
- `/admin/products/new` — create product.
- `/admin/products/[id]/edit` — edit product.

### Expected file changes

- Modify: `app/admin/products/ProductsManager.tsx`
- Create: `app/admin/products/new/page.tsx`
- Create: `app/admin/products/[id]/edit/page.tsx`
- Create: `app/admin/products/_components/ProductFormPage.tsx`
- Create: `app/admin/products/_components/ProductVariantEditor.tsx`
- Create if useful: `app/admin/products/_components/ProductImageManager.tsx`
- Create: `lib/product-form.ts` for pure form factories, normalization, validation, and payload construction
- Create: `tests/product-form.test.ts`
- Reuse: existing `/api/admin/products`, `/api/admin/products/[id]`, and `/api/admin/upload`

Exact component boundaries may be adjusted if the existing code suggests a cleaner split, but the listing must not retain the complete editor implementation.

---

# Phase 1 — Move the Existing Form to a Full Page

## Objective

Resolve the principal usability problem with minimal functional risk: remove the product off-canvas and present the current editor on a dedicated, full-width page while preserving its behavior.

## Task 1.1 — Establish a Regression Baseline

- [ ] Run the existing test suite before changes:

```bash
npm test
```

- [ ] Run lint and production build before changes and record any pre-existing failures:

```bash
npm run lint -- .
npm run build
```

- [ ] Manually capture the current create/edit behavior: default variant, automatic slug, category changes, required fields, upload/remove/reorder images, save, cancel, and temporary upload cleanup.

## Task 1.2 — Extract Pure Product Form Rules

- [ ] Move pure concerns from `ProductsManager.tsx` into `lib/product-form.ts`:
  - empty product and variant factories;
  - slug generation;
  - product-to-form mapping;
  - total variant stock;
  - gross margin preview;
  - category-driven variant normalization;
  - validation result;
  - API payload construction.
- [ ] Avoid changing payload shape or business rules during extraction.
- [ ] Add focused tests for create defaults, edit mapping, slug generation, category normalization, required fields, total stock, and payload construction.

## Task 1.3 — Create Full-Page Routes

- [ ] Add `/admin/products/new` for creation.
- [ ] Add `/admin/products/[id]/edit` for editing.
- [ ] Load categories on both routes using the same source used by the listing.
- [ ] Load the target product server-side for edit and return `notFound()` when it does not exist.
- [ ] Ensure existing admin authentication/authorization applies to both routes.
- [ ] Render a shared `ProductFormPage` in create and edit modes.

## Task 1.4 — Move Existing Behavior Without Redesign

- [ ] Move all current form functionality into `ProductFormPage`:
  - name and automatic slug;
  - description;
  - sale price and cost price;
  - stock total and margin preview;
  - subcategory selection;
  - image upload, temporary cleanup, removal, ordering, and cover rule;
  - weight and shipping weight;
  - gender when applicable;
  - category-driven variants;
  - active, featured, and new flags;
  - POST for create and PUT for edit.
- [ ] Use normal document scrolling, not an internal `overflow-y-auto` form region.
- [ ] Add a clear “Voltar para produtos” action.
- [ ] After a successful save, redirect to `/admin/products` and preserve a visible success message using a query/search parameter or another existing non-persistent feedback mechanism.
- [ ] On cancel, clean only images uploaded during the current unsaved session, matching current behavior.

## Task 1.5 — Update the Listing

- [ ] Change “Novo Produto” to navigate to `/admin/products/new`.
- [ ] Change each edit action to navigate to `/admin/products/[id]/edit`.
- [ ] Remove drawer state, markup, and editor-only logic from `ProductsManager`.
- [ ] Keep filters, search, pagination, activate/deactivate, and delete behavior unchanged.

## Phase 1 Acceptance Criteria

- [ ] No create/edit product drawer remains.
- [ ] Creation and editing use dedicated routes and the full admin content width.
- [ ] Every existing field and conditional rule is still available.
- [ ] Image session cleanup behaves as before.
- [ ] Failed validation/API calls retain all entered data.
- [ ] Product listing behavior is unchanged except for navigation to the new pages.
- [ ] Tests, lint, and build pass.
- [ ] Phase 1 is manually approved before Phase 2 begins.

---

# Phase 2 — Improve Information Architecture and Form Efficiency

## Objective

Turn the full-page form into a polished administrative workflow after functional parity is proven.

## Task 2.1 — Reorganize the Form

- [ ] Create visually distinct sections in this order:
  1. Informações básicas;
  2. Preços e logística;
  3. Imagens;
  4. Estoque e variantes;
  5. Publicação.
- [ ] Put subcategory next to the product name or immediately after it.
- [ ] Move slug into a collapsed “Configurações avançadas” area; keep automatic generation and manual editing.
- [ ] Add a compact desktop section navigator using anchors if it improves orientation; it must not become a wizard.

## Task 2.2 — Improve Actions and Navigation Safety

- [ ] Add a sticky action bar on desktop with Cancel and “Salvar produto”.
- [ ] Use explicit labels: “Criar produto” in create mode and “Salvar alterações” in edit mode.
- [ ] Track whether form data or images differ from the loaded state.
- [ ] Warn before browser navigation, Cancel, Back, or closing the tab when there are unsaved changes.
- [ ] Do not warn after a successful save.
- [ ] Disable repeated submission while saving or uploading.

## Task 2.3 — Improve Validation and Feedback

- [ ] Mark required fields in their labels.
- [ ] Produce field-level errors for at least name, subcategory, sale price, cost price, and invalid variants.
- [ ] Keep a concise error summary at the top.
- [ ] Focus or scroll to the first invalid field after submit.
- [ ] Preserve the server as the final validation authority.
- [ ] Use Brazilian labels and messages consistently.
- [ ] Announce async success/error feedback with an appropriate ARIA live region.

## Task 2.4 — Improve Prices and Images

- [ ] Present stock total and margin as read-only metrics/cards instead of disabled-looking text inputs.
- [ ] Use Brazilian currency-friendly input behavior without changing the numeric API payload.
- [ ] Give image management enough width for meaningful previews.
- [ ] Keep the first image as cover and make that rule visually unmistakable.
- [ ] Support file picker on every device; drag-and-drop may be added only as progressive enhancement.
- [ ] Keep image controls keyboard accessible and labelled.

## Task 2.5 — Improve Variants

- [ ] For categories without variant stock, show one simple inventory card with SKU, stock, and expiry when applicable.
- [ ] For categories with variants, use a compact editable desktop table or grid.
- [ ] Columns/fields must be conditional: name, SKU, stock, expiry, size, color, flavor, active, actions.
- [ ] Do not render irrelevant attributes for the selected category.
- [ ] Keep “Adicionar variante” prominent and show a meaningful generated variant label.
- [ ] Retain at least one variant and preserve all current normalization rules.
- [ ] Confirm destructive variant removal when the row contains meaningful data or represents a persisted variant.

## Task 2.6 — Improve Publication Controls

- [ ] Replace loose checkboxes with clearly labelled switches/cards for:
  - Produto ativo;
  - Exibir em destaque;
  - Marcar como novidade.
- [ ] Add a short consequence description to each control.

## Phase 2 Acceptance Criteria

- [ ] The form hierarchy is understandable without reading every field.
- [ ] Subcategory is selected before category-dependent attributes.
- [ ] Slug remains accessible but no longer competes with primary fields.
- [ ] Users can identify errors at the field and form-summary levels.
- [ ] Unsaved work is protected.
- [ ] Variants are substantially more compact on desktop without losing functionality.
- [ ] Tests, lint, and build pass.

---

# Special Workstream — Mobile Product Registration

Mobile is a first-class acceptance target, not a final CSS cleanup. Validate at minimum at 320, 360, 390, 430, and 768 CSS pixels.

## Mobile Layout

- [ ] Use one-column layout for all primary fields below the medium breakpoint.
- [ ] Do not use fixed form widths or horizontal page scrolling.
- [ ] Respect device safe areas using `env(safe-area-inset-bottom)` for bottom actions.
- [ ] Hide or simplify the desktop section navigator; use a compact section summary if needed.
- [ ] Ensure headings, feedback, and cards do not overflow with long product/category names.

## Mobile Actions

- [ ] Provide a sticky bottom action bar with full-width or comfortably sized Cancel/Save actions.
- [ ] Ensure the bar does not cover the last input; add bottom content padding accordingly.
- [ ] Keep every touch target at least 44 × 44 CSS pixels.
- [ ] Preserve visible loading state and prevent double taps during save/upload.

## Mobile Inputs and Keyboard

- [ ] Use `inputMode="decimal"` for prices/weight and `inputMode="numeric"` for stock where appropriate.
- [ ] Use at least 16 px input text on mobile to avoid unwanted iOS zoom.
- [ ] Ensure focused fields are not hidden by the virtual keyboard or sticky action bar.
- [ ] Keep labels visible; do not use placeholders as the only label.
- [ ] Use native date and file controls compatibly on mobile.

## Mobile Images

- [ ] Make camera/gallery file selection work through the normal file input.
- [ ] Render previews in a one- or two-column grid according to available width.
- [ ] Provide explicit buttons to set/move cover and delete; do not require drag gestures.
- [ ] Avoid hover-only controls.

## Mobile Variants

- [ ] Do not force the desktop variant table onto mobile.
- [ ] Render each variant as a collapsible card with a concise summary such as `Chocolate · 900g · estoque 8`.
- [ ] Keep add/remove/status actions reachable without horizontal scrolling.
- [ ] Expand the first invalid variant automatically after validation.
- [ ] Preserve entered values when a card is collapsed.

## Mobile Accessibility and QA

- [ ] Check portrait and landscape orientation.
- [ ] Check Android Chrome and iOS Safari behavior where devices are available.
- [ ] Check keyboard-only navigation on desktop and screen-reader-friendly labels on all form controls.
- [ ] Confirm no action depends solely on hover.
- [ ] Confirm error summary links/focus work on a narrow viewport.
- [ ] Confirm image upload, category-dependent fields, multiple variants, cancel, save, and unsaved-change warning on mobile.

## Mobile Acceptance Criteria

- [ ] No horizontal page scroll at supported widths.
- [ ] No field, feedback, dialog, or action bar is clipped.
- [ ] The form can be completed with one hand without precision taps.
- [ ] Virtual keyboard does not block the active field or Save action.
- [ ] Multiple variants remain understandable and editable without a desktop-style table.
- [ ] Mobile completion does not require switching to desktop mode.

---

## 5. Verification Matrix

### Automated

- [ ] `npm test`
- [ ] `npm run lint -- .`
- [ ] `npm run build`
- [ ] Pure tests cover factories, mapping, slug, category normalization, validation, stock total, margin, and payload.

### Manual create flow

- [ ] Create a supplement with flavor, stock, expiry, image, weight, price, and cost.
- [ ] Create a fashion product with size, color, gender, multiple variants, and images.
- [ ] Create a category without variant stock.
- [ ] Verify automatic slug and manual advanced edit.
- [ ] Verify margin and total stock previews.

### Manual edit flow

- [ ] Edit basic data without losing variants.
- [ ] Change category and confirm hidden attributes are normalized according to current rules.
- [ ] Add, edit, deactivate, and remove variants.
- [ ] Add, reorder, and remove images; confirm cover selection.
- [ ] Cancel and confirm unsaved temporary uploads are cleaned.

### Failure and regression

- [ ] Submit missing required fields and verify field-level feedback/focus.
- [ ] Simulate API failure and verify all form state remains.
- [ ] Attempt navigation with unsaved changes and verify warning.
- [ ] Confirm product listing filters, search, pagination, toggle, and delete still work.
- [ ] Confirm customer registration, storefront, checkout, PDV, and integrations are unaffected.

## 6. Implementation Guardrails

- Do not modify database schema or product API contracts unless an unexpected blocker is documented and approved.
- Do not duplicate create and edit forms.
- Do not mix Phase 2 redesign into Phase 1 before parity is verified.
- Do not remove upload cleanup or allow orphaned temporary files.
- Do not introduce a new form library solely for this work unless clearly justified.
- Do not push `main` or deploy production during implementation/testing.
- Keep changes in a feature branch and use small, reviewable commits.

## 7. Suggested Commit Plan

- [ ] `test(products): cover product form normalization`
- [ ] `refactor(products): extract shared product form rules`
- [ ] `feat(products): move editor to dedicated pages`
- [ ] `feat(products): improve product form information architecture`
- [ ] `feat(products): optimize product form for mobile`
- [ ] `test(products): verify responsive product registration`

## 8. Definition of Done

- Both phases and the mobile workstream meet their acceptance criteria.
- Create and edit flows have functional parity with the former drawer.
- Product registration is comfortable on desktop and fully usable on mobile.
- Tests, lint, and production build pass with no unexplained regressions.
- Manual QA evidence is recorded in the PR or implementation notes.
- Production deployment occurs only after explicit approval.
