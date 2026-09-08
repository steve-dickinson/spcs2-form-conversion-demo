# Form-to-service conversion checklist

This checklist captures the repeatable process used to convert the
Seed Potato Classification Scheme (SPCS2) paper form into the digital,
multi-page GOV.UK Design System journey in this repository. It is
written so that a contractor with no prior knowledge of SPCS2 could
point the same process at a **different** legacy paper/PDF form and
produce an equivalent digital service.

This is a demo/reference artefact only. It is a personal project by
the repo owner, not affiliated with, endorsed by, or representative of
Defra or HM Government, and does not describe or depend on any real
Defra/APHA system, dataset, or integration.

Work through the four stages below, in order, for any new source form.
Each stage names the concrete file(s) in this repo where you can see
the pattern already applied, so you can use them as a template.

---

## Stage 1 -- Source-form field extraction

**Goal:** produce a flat, unambiguous list of every field the legacy
form asks for, grouped by the section/page it belongs to on the paper
form, before writing any code.

1. Obtain the source form (paper scan or PDF). List every field in
   reading order, recording for each one:
   - the exact label text as printed on the form
   - the field's apparent data type (free text, single choice, multi
     choice, date, number, reference/ID, signature)
   - whether the form marks it as mandatory (e.g. an asterisk) or
     mandatory is only implied by "must be completed" instructions
   - any format hint printed next to it (e.g. "DD/MM/YYYY", "e.g.
     SW1A 1AA", a maximum character count)
   - any branching instruction attached to it (e.g. "if No, go to
     section 4", "if not on the list, specify below")
2. Group the extracted fields into logical sections that mirror the
   paper form's own section breaks. In this demo, SPCS2's sections
   became:
   - applicant / business details
   - land parcel / holding details
   - seed potato variety & class
   - stock declaration
   - declaration / signature (mocked as the confirm-and-send step)
3. For every section, decide the **session key** it will be stored
   under (a short camelCase name). This repo uses
   `applicantDetails`, `landHoldingDetails`, `seedPotatoVariety`,
   `stockDeclaration` -- see the shared session contract documented at
   the top of `app/router.js`.
4. Write the extracted list down as a table (field, type, mandatory?,
   format hint, branching?, session key + field name) before moving on
   -- this table is your source of truth for stages 2 and 3, and is
   worth keeping in the repo (e.g. as `FIELD-EXTRACTION.md`) for the
   next form this process gets applied to.

**Output of this stage:** one row per source-form field, with a
proposed session key/field name for each, ready to map onto GDS
components.

---

## Stage 2 -- GDS component mapping

**Goal:** map every extracted field onto a standard GOV.UK Design
System component and decide which page of the digital journey it
lives on.

Use this mapping table as a default starting point (deviate only when
a field genuinely doesn't fit):

| Source-form field shape                          | GOV.UK Frontend component            | Example in this repo |
|---------------------------------------------------|---------------------------------------|-----------------------|
| Single line of free text                          | `govukInput`                          | `fullName`, `holdingName` (`app/views/applicant-details.njk`, `app/views/land-holding-details.njk`) |
| Formatted text (postcode, reference number, phone) | `govukInput` with a hint showing the expected format | `postcode`, `parcelReference` (`app/views/land-holding-details.njk`) |
| Email address                                     | `govukInput` with `type: "email"`      | `emailAddress` |
| Whole-number quantity                              | `govukInput` with `inputmode: "numeric"` | `quantityOfSeedPotatoes` (`app/views/stock-declaration.njk`) |
| Date (day/month/year on the paper form)            | `govukDateInput`                       | `stockDeclarationDate` (`app/views/stock-declaration.njk`) |
| Pick exactly one of a short fixed list             | `govukRadios`                          | `potatoClass`, `varietyOnList` (`app/views/seed-potato-variety.njk`) |
| Pick any of a fixed list                           | `govukCheckboxes`                      | (not needed by SPCS2's fields, but use this for "tick all that apply" sections) |
| "If X, also tell us Y" branching field             | `govukRadios`/`govukCheckboxes` item with a `conditional.html` block containing the dependent `govukInput`/etc. | `varietyOtherDetails`, revealed only when `varietyOnList` is answered `no` |
| Section review before final submission             | `govukSummaryList` with a "Change" action per row | `app/views/check-your-answers.njk` |
| Final confirmation / reference number              | `govukPanel`                           | `app/views/confirmation.njk` |
| Any page a form can be submitted with errors on     | `govukErrorSummary` at the top of the page, plus each field's own `errorMessage` option | `app/views/partials/error-summary.njk`, reused by every page-with-a-form template |

Steps to apply this mapping to a new form:

1. Walk your Stage 1 table top to bottom and assign one row of the
   mapping table above to each field.
2. Decide page boundaries: GDS convention is one *topic* per page
   (question-per-page or a small logical grouping), not one page per
   paper-form section necessarily -- but starting from the paper
   form's own sections (as this demo did) is a reasonable default and
   keeps the mapping traceable back to the source form.
3. For every page, decide its position in the linear journey and its
   "Continue" target (the next page), plus its "Back" link target
   (the previous page). Encode this as an ordered list, e.g. the
   `STEPS` array and route definitions in `app/router.js`.
4. Add a route guard so a page can only be reached once every earlier
   page's answers exist in session (see `requireAnswers(...)` in
   `app/router.js`) -- this is what turns a set of pages into an
   enforced, linear *journey* rather than a set of independently
   reachable URLs.
5. Add one row per field, per page, to the eventual
   check-your-answers page, each with a "Change" link back to the
   owning page (and, where practical, a URL fragment identifying the
   specific field -- see `buildSummarySections` in
   `app/controllers/check-your-answers.js`).

**Output of this stage:** an ordered list of pages, each with its
fields assigned a GOV.UK component, ready for validation rules to be
derived per field.

---

## Stage 3 -- Validation-rule derivation

**Goal:** turn the "mandatory", "format hint" and "branching"
columns from Stage 1 into concrete, testable validation functions.

1. **Required fields.** Any field marked mandatory on the paper form
   becomes a "must not be blank" check. Keep this generic and reusable
   -- see `isBlank`/`isPresent` in `app/validation/rules.js`, and the
   `requiredText`/`requiredRadio` schema-builder helpers in
   `app/validation/schemas.js` that wrap it for a given field name and
   label.
2. **Format fields.** Any field with a printed format hint (postcode,
   date, reference number, email) becomes its own pure format-checking
   function, independent of Express/sessions/templating, so it can be
   unit tested directly:
   - postcode shape -- `isValidPostcode` in `app/validation/rules.js`
   - date fields -- split into two separate, composable checks:
     "is this a real calendar date at all" (`isRealCalendarDate`,
     which catches e.g. 31 April or 29 Feb in a non-leap year) and
     "is this date in the future when it shouldn't be"
     (`isFutureDate`) -- deriving these as two rules, not one, means a
     future date and a nonsense date can get distinct, accurate error
     messages.
   - any other formatted reference number/code: write an equivalent
     pure regex-based checker function alongside the ones above.
3. **Conditional/branching fields.** Any "if you answered X above,
   also tell us Y" instruction on the paper form becomes a
   conditional-required check that takes the *triggering* field's
   value, the set of trigger values that make the dependent field
   required, and the dependent field's own value -- see
   `isConditionallyRequiredAndMissing` in `app/validation/rules.js`,
   applied to the `varietyOnList` → `varietyOtherDetails` pair in
   `app/validation/schemas.js`.
4. **Per-page schema.** For every page, assemble its fields' validate
   functions into one ordered array (order = page order = error
   summary order, per GDS guidance that the error summary lists errors
   in the same order fields appear on the page) -- see the `schemas`
   object in `app/validation/schemas.js`.
5. **Error rendering.** Every page's controller runs its schema's
   `validateAnswers(schema, body)` once per submission and, if there
   are any errors, re-renders the same page with both:
   - the full ordered error list, fed to the shared
     `govukErrorSummary` partial (`app/views/partials/error-summary.njk`)
   - a per-field error map, fed to each field's own component
     `errorMessage` option, so an inline error appears next to every
     offending field, not just the summary at the top.

   This "validate everything, report everything in one pass" shape
   (rather than stopping at the first invalid field) is what satisfies
   the "list all errors on that page in one pass" requirement -- see
   `validateAnswers` in `app/validation/schemas.js`.
6. **Write the tests first (or alongside).** For each derived rule,
   write at least one bad-input example and one good-input example as
   a unit test against the pure function in `rules.js` (see
   `test/validation.test.js`), independent of the page it will
   eventually sit on.

**Output of this stage:** one validation schema array per page, each
field backed by a pure, independently-tested rule function.

---

## Stage 4 -- Assemble and safeguard the journey

Once Stages 1--3 are done for every page, wire the whole thing
together and apply this demo's non-negotiable safeguards -- these
apply regardless of which source form you're converting:

1. **Session, not database.** Store answers in an ephemeral,
   in-memory session only (see `app/middleware/session.js`) --
   never a real database, never real applicant data. Clear the
   session once the confirmation page has been shown
   (`app/controllers/confirmation.js`).
2. **Mocked submission only.** The "final submit" step must never make
   a real network call or write to a real system. Generate a
   locally-produced, presentation-only reference number instead (see
   `app/data/mock-reference.js`) and be explicit in the UI that this is
   mocked.
3. **Persistent DEMO banner.** Every single page -- including the
   start and confirmation pages -- must render an unmissable "DEMO --
   not a live service" banner. Put this in the shared base layout's
   `bodyStart` block (see `app/views/layout.njk` and
   `app/views/partials/demo-banner.njk`) rather than relying on each
   page template to remember to include it.
4. **Fictional data only.** Use a made-up persona and made-up example
   values throughout (see the `PERSONA` constant in
   `app/controllers/start.js`); never reference or collect real
   applicant data.
5. **Tests.** Cover, at minimum: every route renders with a 200 and
   the DEMO banner present (`test/routes.test.js`); every derived
   validation rule with at least one bad-input example
   (`test/validation.test.js`); the full linear journey, including
   check-your-answers "Change" links and a mocked confirmation
   reference with no outbound network calls (`test/journey.test.js`).
6. **Repeat for the next form.** When applying this checklist to a
   different source form, only Stages 1--3's *content* changes (the
   fields, their components, their rules); Stage 4's safeguards and
   testing shape should be copied unchanged.