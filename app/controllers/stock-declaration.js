'use strict';

const { schemas, validateAnswers } = require('../validation/schemas');

/**
 * Step 5 of 6: stock declaration.
 *
 * GET renders the page, pre-filling any previously entered values from
 * req.session.answers.stockDeclaration (e.g. if the applicant came back
 * via a "Change" link from check-your-answers, or hit Back after a later
 * step). POST validates the submitted body against
 * schemas.stockDeclaration (see app/validation/schemas.js) -- including
 * the invalid/future date check on stockDeclarationDate -- and either
 * re-renders the page with the GDS error summary plus inline errors, or
 * stores the answers in the session and redirects on to
 * check-your-answers.
 *
 * This step is only reachable once applicantDetails, landHoldingDetails
 * and seedPotatoVariety have been stored in the session, which
 * app/router.js enforces via requireAnswers before either handler below
 * is ever called.
 *
 * Nothing here is persisted anywhere beyond the in-memory session store
 * (see app/middleware/session.js) -- this is mock/fictional data only,
 * describing a fictional seed potato holding for demonstration purposes,
 * with no affiliation to Defra, APHA, or any real classification scheme.
 */

const NEXT_STEP_PATH = '/check-your-answers';

function get(req, res) {
  const answers = (req.session && req.session.answers) || {};
  const values = answers.stockDeclaration || {};

  res.render('stock-declaration.njk', {
    values,
    errorList: [],
    errorMap: {}
  });
}

function post(req, res) {
  const body = req.body || {};
  const { hasErrors, errorList, errorMap } = validateAnswers(
    schemas.stockDeclaration,
    body
  );

  if (hasErrors) {
    return res.render('stock-declaration.njk', {
      values: body,
      errorList,
      errorMap
    });
  }

  if (!req.session.answers) {
    req.session.answers = {};
  }

  req.session.answers.stockDeclaration = {
    quantityOfSeedPotatoes: body.quantityOfSeedPotatoes,
    'stockDeclarationDate-day': body['stockDeclarationDate-day'],
    'stockDeclarationDate-month': body['stockDeclarationDate-month'],
    'stockDeclarationDate-year': body['stockDeclarationDate-year']
  };

  return res.redirect(NEXT_STEP_PATH);
}

module.exports = { get, post };