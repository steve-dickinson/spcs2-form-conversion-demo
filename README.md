# SPCS2 demo service

A demonstration of converting a legacy paper/PDF government form into a
digital, multi-page GOV.UK Design System journey -- built end-to-end
against one concrete, real test case: the Seed Potato Classification
Scheme (SPCS2) application form.

**Personal project by the repo owner. Not affiliated with, endorsed by, or representative of Defra or HM Government.**

This is a **DEMO -- not a live service**. No real applicant data is ever
collected, stored, or submitted. Every page in the journey is watermarked
with an unmissable "DEMO -- not a live service" banner, every "form
submission" is held only in an ephemeral, in-memory session for the
lifetime of a single browser session, and the final "Confirm and send"
step never makes any real network call, database write, or integration
with DEFRA, APHA, or any other real system -- it only generates a
locally-produced, mocked reference number (see `app/data/mock-reference.js`).

## Why this exists

Government holds thousands of legacy paper/PDF forms that need converting
to GDS-standard digital services. The value of this repo isn't the
potato scheme itself -- it's the repeatable *pattern*: extract fields
from a legacy PDF, map them onto GOV.UK Design System components, derive
validation rules from the paper form's own mandatory/format/branching
instructions, and assemble the result into a proper multi-page GDS
journey. That pattern is written up as a standalone, reusable artefact in
[`CHECKLIST.md`](./CHECKLIST.md), detailed enough that the same steps
could be pointed at a different legacy form next time.

## What's in scope

- A multi-page GOV.UK-styled journey replicating SPCS2's fields and
  logic: start page → applicant/business details → land/holding details
  → seed potato variety & class → stock declaration → check-your-answers
  → confirmation.
- Client- and server-side validation matching the rules implied by the
  paper form: required fields, a UK postcode format check, an
  invalid/future date check, and a conditional/branching field that only
  becomes required depending on a preceding answer.
- Standard GOV.UK Frontend components and GDS patterns: the error summary
  component, inline field errors, a check-your-answers page with "Change"
  links, and a confirmation page.
- A fictional citizen persona and fictional/mock data only.
- A persistent "DEMO -- not a live service" banner on every page, and a
  disabled/mocked final submission.

## What's explicitly out of scope

- Any real backend integration with DEFRA, APHA, or any live government
  system.
- Any real data storage, database, authentication, or user accounts.
- Hosting on a gov.uk-look-alike domain, or any real Crown/GOV.UK
  branding beyond the standard open-source GOV.UK Frontend component
  library.
- Payment, document upload/attachment handling, or case-worker/back-office
  review screens.
- Welsh-language support, a full accessibility audit, or analytics.

See [`design.md`](./design.md) for the full problem statement, scope, and
acceptance criteria this build was produced against.

## Running this locally

This repo is designed to be run via Docker Compose:

```
docker compose up
```

Once it's up, open http://localhost:8000 in a browser and follow the
"Start now" link through the journey.

### Running without Docker

If you'd rather run it directly with Node:

```
npm install
npm start
```

The server listens on `0.0.0.0:8000`, so it's reachable at
http://localhost:8000 either way.

### Running the tests

```
npm test
```

This runs the test suite covering route rendering (including the DEMO
banner being present on every page), the validation rules (postcode
format, invalid/future date, conditional-required field) with specific
bad-input examples, and the full journey flow (sequential Continue
navigation, check-your-answers Change links, and a mocked confirmation
reference number with no external network calls).

## The reusable conversion pattern

The step-by-step process used to turn SPCS2's paper form into this
journey -- source-form field extraction, GDS component mapping, and
validation-rule derivation -- is written up in full in
[`CHECKLIST.md`](./CHECKLIST.md). It references the concrete files in
this repo as worked examples, so it can be read either as documentation
of what's here, or as a standalone guide for converting a different
legacy form.

## Data and privacy

Nothing you enter into this demo is real, required to be real, stored
beyond your current browser session, or sent anywhere. The session is
held in an in-memory store only (see `app/middleware/session.js`) and is
cleared as soon as the confirmation page is shown. There is no database,
no authentication, and no persistence of any kind in this repository.