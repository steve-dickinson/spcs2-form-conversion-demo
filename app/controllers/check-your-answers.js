'use strict';

const { generateReferenceNumber } = require('../data/mock-reference');

/**
 * Step 6 of 6: check your answers.
 *
 * GET assembles every answer stored across the four earlier steps
 * (req.session.answers.{applicantDetails, landHoldingDetails,
 * seedPotatoVariety, stockDeclaration} -- the exact shape each of those
 * steps' own controllers writes) into a set of GOV.UK summary-list-shaped
 * sections, each row carrying a "Change" link back to the step (and
 * field) it came from, and renders them for review.
 *
 * Each row below is built already in the exact shape the govukSummaryList
 * Nunjucks macro expects (`{ key: { text }, value: { text }, actions:
 * { items: [...] } }`), rather than being transformed template-side --
 * Nunjucks does not ship a Jinja2-style `map` filter that accepts an
 * arbitrary callable, so building that shape here in plain JS (which can
 * be unit/integration tested directly) is both correct and testable,
 * where the equivalent template-side transform was not.
 *
 * POST is this demo's (mocked) final submission: no network call, no
 * database write, no real DEFRA/APHA integration of any kind happens
 * here or anywhere else in this repo. It only generates a mocked
 * reference number (see app/data/mock-reference.js), stamps the session
 * as submitted, and redirects to the confirmation page, which is the
 * only page that reads req.session.submitted / req.session.referenceNumber
 * (see app/router.js's requireSubmitted guard and
 * app/controllers/confirmation.js).
 *
 * This step is only reachable once every earlier step's answers have
 * been stored in the session, which app/router.js enforces via
 * requireAnswers before either handler below is ever called.
 */

const POTATO_CLASS_LABELS = {
  'pre-basic': 'Pre-basic',
  basic: 'Basic',
  certified: 'Certified'
};

const YES_NO_LABELS = {
  yes: 'Yes',
  no: 'No'
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Formats a mapped label for a value, falling back to the raw value
 * (rather than hiding it) if it doesn't match a known code -- so an
 * unexpected/legacy value is still visible to the applicant on review
 * rather than silently disappearing.
 */
function formatLabel(labels, value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  return labels[value] || String(value);
}

/**
 * Formats a GOV.UK-style date input's three parts (day, month, year) as
 * a human-readable date, e.g. "5 April 2024". Falls back to a blank
 * string if any part is missing, since this page only ever renders
 * previously-validated answers.
 */
function formatDate(day, month, year) {
  if (!day || !month || !year) {
    return '';
  }

  const monthIndex = Number.parseInt(month, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] || month;

  return `${Number.parseInt(day, 10)} ${monthName} ${year}`;
}

/**
 * Builds one govukSummaryList-shaped row.
 *
 * @param {string} key - the row's visible label
 * @param {string} value - the row's visible value
 * @param {string} changeHref - full href (including URL fragment) for
 *   the row's "Change" action
 */
function buildRow(key, value, changeHref) {
  return {
    key: { text: key },
    value: { text: value },
    actions: {
      items: [
        {
          href: changeHref,
          text: 'Change',
          visuallyHiddenText: key
        }
      ]
    }
  };
}

/**
 * Builds the section/row structure the check-your-answers.njk template
 * renders. Each row's "Change" action href points back at the owning
 * step and, where the field has one, the same DOM id used as that
 * field's error summary anchor in app/validation/schemas.js -- so
 * "Change" both navigates to the right step and (via the URL fragment)
 * scrolls/focuses the right field on it.
 *
 * @param {object} answers - req.session.answers
 * @returns {Array<{ heading: string, changeHref: string, rows: Array<object> }>}
 */
function buildSummarySections(answers) {
  const applicantDetails = answers.applicantDetails || {};
  const landHoldingDetails = answers.landHoldingDetails || {};
  const seedPotatoVariety = answers.seedPotatoVariety || {};
  const stockDeclaration = answers.stockDeclaration || {};

  const sections = [
    {
      heading: 'Applicant details',
      changeHref: '/applicant-details',
      rows: [
        buildRow('Full name', applicantDetails.fullName || '', '/applicant-details#fullName'),
        buildRow(
          'Business or holding name',
          applicantDetails.businessName || '',
          '/applicant-details#businessName'
        ),
        buildRow(
          'Email address',
          applicantDetails.emailAddress || '',
          '/applicant-details#emailAddress'
        ),
        buildRow(
          'Telephone number',
          applicantDetails.telephoneNumber || '',
          '/applicant-details#telephoneNumber'
        )
      ]
    },
    {
      heading: 'Land holding details',
      changeHref: '/land-holding-details',
      rows: [
        buildRow(
          'Land holding name',
          landHoldingDetails.holdingName || '',
          '/land-holding-details#holdingName'
        ),
        buildRow(
          'Address line 1',
          landHoldingDetails.addressLine1 || '',
          '/land-holding-details#addressLine1'
        ),
        buildRow(
          'Town or city',
          landHoldingDetails.townOrCity || '',
          '/land-holding-details#townOrCity'
        ),
        buildRow(
          'Postcode',
          landHoldingDetails.postcode || '',
          '/land-holding-details#postcode'
        ),
        buildRow(
          'Land parcel reference number',
          landHoldingDetails.parcelReference || '',
          '/land-holding-details#parcelReference'
        )
      ]
    },
    {
      heading: 'Seed potato variety and class',
      changeHref: '/seed-potato-variety',
      rows: [
        buildRow(
          'Seed potato class',
          formatLabel(POTATO_CLASS_LABELS, seedPotatoVariety.potatoClass),
          '/seed-potato-variety#potatoClass'
        ),
        buildRow(
          'Is the variety on the classified variety list?',
          formatLabel(YES_NO_LABELS, seedPotatoVariety.varietyOnList),
          '/seed-potato-variety#varietyOnList'
        )
      ]
    },
    {
      heading: 'Stock declaration',
      changeHref: '/stock-declaration',
      rows: [
        buildRow(
          'Quantity of seed potatoes (tonnes)',
          stockDeclaration.quantityOfSeedPotatoes || '',
          '/stock-declaration#quantityOfSeedPotatoes'
        ),
        buildRow(
          'Date of stock declaration',
          formatDate(
            stockDeclaration['stockDeclarationDate-day'],
            stockDeclaration['stockDeclarationDate-month'],
            stockDeclaration['stockDeclarationDate-year']
          ),
          '/stock-declaration#stockDeclarationDate-day'
        )
      ]
    }
  ];

  // The "please specify the variety" field is only ever populated (and
  // only ever required, per the conditional-required rule in
  // app/validation/schemas.js) when varietyOnList was answered "no" --
  // only show the row at all when there's something to show, rather
  // than rendering a permanently-blank row for the common case.
  if (seedPotatoVariety.varietyOtherDetails) {
    sections[2].rows.push(
      buildRow(
        'Variety name (if not on the list)',
        seedPotatoVariety.varietyOtherDetails,
        '/seed-potato-variety#varietyOtherDetails'
      )
    );
  }

  return sections;
}

function get(req, res) {
  const answers = (req.session && req.session.answers) || {};

  res.render('check-your-answers.njk', {
    sections: buildSummarySections(answers)
  });
}

/**
 * Handles the (mocked) final submission. This never sends anything
 * anywhere: it only generates a locally-produced mocked reference
 * number, records that a submission has happened so the confirmation
 * page's requireSubmitted guard (see app/router.js) will allow it to be
 * viewed, and redirects there.
 */
function post(req, res) {
  req.session.submitted = true;
  req.session.referenceNumber = generateReferenceNumber();

  return res.redirect('/confirmation');
}

module.exports = { get, post };
