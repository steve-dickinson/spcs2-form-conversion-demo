'use strict';

const { schemas, validateAnswers } = require('../validation/schemas');

/**
 * Step 4 of 6: seed potato variety & class.
 *
 * GET renders the page, pre-filling any previously entered values from
 * req.session.answers.seedPotatoVariety (e.g. if the applicant came back
 * via a "Change" link from check-your-answers, or hit Back after a later
 * step). POST validates the submitted body against
 * schemas.seedPotatoVariety (see app/validation/schemas.js) -- including
 * the conditional-required "varietyOtherDetails" field, which only
 * becomes required when "varietyOnList" is answered "no" -- and either
 * re-renders the page with the GDS error summary plus inline errors, or
 * stores the answers in the session and redirects on to the next step.
 *
 * This step is only reachable once applicantDetails and
 * landHoldingDetails have been stored in the session, which
 * app/router.js enforces via requireAnswers before either handler below
 * is ever called.
 *
 * Nothing here is persisted anywhere beyond the in-memory session store
 * (see app/middleware/session.js) -- this is mock/fictional data only,
 * describing a fictional seed potato holding for demonstration purposes,
 * with no affiliation to Defra, APHA, or any real classification scheme.
 */

const NEXT_STEP_PATH = '/stock-declaration';

function get(req, res) {
  const answers = (req.session && req.session.answers) || {};
  const values = answers.seedPotatoVariety || {};

  res.render('seed-potato-variety.njk', {
    values,
    errorList: [],
    errorMap: {}
  });
}

function post(req, res) {
  const body = req.body || {};
  const { hasErrors, errorList, errorMap } = validateAnswers(
    schemas.seedPotatoVariety,
    body
  );

  if (hasErrors) {
    return res.render('seed-potato-variety.njk', {
      values: body,
      errorList,
      errorMap
    });
  }

  if (!req.session.answers) {
    req.session.answers = {};
  }

  req.session.answers.seedPotatoVariety = {
    potatoClass: body.potatoClass,
    varietyOnList: body.varietyOnList,
    varietyOtherDetails: body.varietyOtherDetails
  };

  return res.redirect(NEXT_STEP_PATH);
}

module.exports = { get, post };