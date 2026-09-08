'use strict';

const { schemas, validateAnswers } = require('../validation/schemas');

/**
 * Step 3 of 6: land parcel / holding details.
 *
 * GET renders the page, pre-filling any previously entered values from
 * req.session.answers.landHoldingDetails (e.g. if the applicant came back
 * via a "Change" link from check-your-answers, or hit Back after a later
 * step). POST validates the submitted body against
 * schemas.landHoldingDetails (see app/validation/schemas.js) -- including
 * the postcode format check -- and either re-renders the page with the
 * GDS error summary plus inline errors, or stores the answers in the
 * session and redirects on to the next step.
 *
 * This step is only reachable once applicantDetails has been stored in
 * the session, which app/router.js enforces via requireAnswers before
 * either handler below is ever called.
 *
 * Nothing here is persisted anywhere beyond the in-memory session store
 * (see app/middleware/session.js) -- this is mock/fictional data only.
 */

const NEXT_STEP_PATH = '/seed-potato-variety';

function get(req, res) {
  const answers = (req.session && req.session.answers) || {};
  const values = answers.landHoldingDetails || {};

  res.render('land-holding-details.njk', {
    values,
    errorList: [],
    errorMap: {}
  });
}

function post(req, res) {
  const body = req.body || {};
  const { hasErrors, errorList, errorMap } = validateAnswers(
    schemas.landHoldingDetails,
    body
  );

  if (hasErrors) {
    return res.render('land-holding-details.njk', {
      values: body,
      errorList,
      errorMap
    });
  }

  if (!req.session.answers) {
    req.session.answers = {};
  }

  req.session.answers.landHoldingDetails = {
    holdingName: body.holdingName,
    addressLine1: body.addressLine1,
    townOrCity: body.townOrCity,
    postcode: body.postcode,
    parcelReference: body.parcelReference
  };

  return res.redirect(NEXT_STEP_PATH);
}

module.exports = { get, post };