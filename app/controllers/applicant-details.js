'use strict';

const { schemas, validateAnswers } = require('../validation/schemas');

/**
 * Step 2 of 6: applicant / business details.
 *
 * GET renders the page, pre-filling any previously entered values from
 * req.session.answers.applicantDetails (e.g. if the applicant came back
 * via a "Change" link from check-your-answers, or hit Back after a later
 * step). POST validates the submitted body against
 * schemas.applicantDetails (see app/validation/schemas.js) and either
 * re-renders the page with the GDS error summary plus inline errors, or
 * stores the answers in the session and redirects on to the next step.
 *
 * Nothing here is persisted anywhere beyond the in-memory session store
 * (see app/middleware/session.js) -- this is mock/fictional data only.
 */

const NEXT_STEP_PATH = '/land-holding-details';

function get(req, res) {
  const answers = (req.session && req.session.answers) || {};
  const values = answers.applicantDetails || {};

  res.render('applicant-details.njk', {
    values,
    errorList: [],
    errorMap: {}
  });
}

function post(req, res) {
  const body = req.body || {};
  const { hasErrors, errorList, errorMap } = validateAnswers(
    schemas.applicantDetails,
    body
  );

  if (hasErrors) {
    return res.render('applicant-details.njk', {
      values: body,
      errorList,
      errorMap
    });
  }

  if (!req.session.answers) {
    req.session.answers = {};
  }

  req.session.answers.applicantDetails = {
    fullName: body.fullName,
    businessName: body.businessName,
    emailAddress: body.emailAddress,
    telephoneNumber: body.telephoneNumber
  };

  return res.redirect(NEXT_STEP_PATH);
}

module.exports = { get, post };