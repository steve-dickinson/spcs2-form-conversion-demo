'use strict';

const express = require('express');

const startController = require('./controllers/start');
const applicantDetailsController = require('./controllers/applicant-details');
const landHoldingDetailsController = require('./controllers/land-holding-details');
const seedPotatoVarietyController = require('./controllers/seed-potato-variety');
const stockDeclarationController = require('./controllers/stock-declaration');
const checkYourAnswersController = require('./controllers/check-your-answers');
const confirmationController = require('./controllers/confirmation');

const router = express.Router();

/**
 * Session contract shared with every controller in app/controllers/*:
 *
 *   req.session.answers = {
 *     applicantDetails:   { ... } | undefined,
 *     landHoldingDetails: { ... } | undefined,
 *     seedPotatoVariety:  { ... } | undefined,
 *     stockDeclaration:   { ... } | undefined
 *   }
 *   req.session.submitted       = true | undefined   (set by check-your-answers POST)
 *   req.session.referenceNumber = string | undefined (set by check-your-answers POST)
 *
 * The journey is a strict, linear sequence. Each step below is only reachable
 * (GET or POST) once every earlier step has stored its answers in the
 * session -- this is what "reachable only via the previous step's Continue"
 * means in practice, since the only way an earlier step's session data gets
 * populated is that step's own Continue submission succeeding.
 *
 * This is deliberately mocked/ephemeral state (see
 * app/middleware/session.js) -- nothing here is persisted beyond the
 * in-memory session store, and no real submission ever occurs.
 */
const STEPS = [
  { path: '/applicant-details', sessionKey: 'applicantDetails' },
  { path: '/land-holding-details', sessionKey: 'landHoldingDetails' },
  { path: '/seed-potato-variety', sessionKey: 'seedPotatoVariety' },
  { path: '/stock-declaration', sessionKey: 'stockDeclaration' }
];

function getAnswers(req) {
  return (req.session && req.session.answers) || {};
}

/**
 * Guards a step so it can only be viewed/submitted once every session
 * answer key named in `sessionKeys` has already been populated by an
 * earlier step's successful Continue. Redirects back to the earliest
 * missing step (or the start page) otherwise.
 */
function requireAnswers(...sessionKeys) {
  return (req, res, next) => {
    const answers = getAnswers(req);

    for (const sessionKey of sessionKeys) {
      if (!answers[sessionKey]) {
        const missingStep = STEPS.find((step) => step.sessionKey === sessionKey);
        return res.redirect(missingStep ? missingStep.path : '/');
      }
    }

    return next();
  };
}

/**
 * Guards the confirmation page so it is only reachable after a (mocked)
 * final submission has happened from check-your-answers.
 */
function requireSubmitted(req, res, next) {
  if (req.session && req.session.submitted) {
    return next();
  }

  return res.redirect('/check-your-answers');
}

// Step 1 of 6: start page.
router.get('/', startController.get);

// Step 2 of 6: applicant / business details.
router.get('/applicant-details', applicantDetailsController.get);
router.post('/applicant-details', applicantDetailsController.post);

// Step 3 of 6: land parcel / holding details.
router.get(
  '/land-holding-details',
  requireAnswers('applicantDetails'),
  landHoldingDetailsController.get
);
router.post(
  '/land-holding-details',
  requireAnswers('applicantDetails'),
  landHoldingDetailsController.post
);

// Step 4 of 6: seed potato variety & class (includes conditional field).
router.get(
  '/seed-potato-variety',
  requireAnswers('applicantDetails', 'landHoldingDetails'),
  seedPotatoVarietyController.get
);
router.post(
  '/seed-potato-variety',
  requireAnswers('applicantDetails', 'landHoldingDetails'),
  seedPotatoVarietyController.post
);

// Step 5 of 6: stock declaration (includes date validation).
router.get(
  '/stock-declaration',
  requireAnswers('applicantDetails', 'landHoldingDetails', 'seedPotatoVariety'),
  stockDeclarationController.get
);
router.post(
  '/stock-declaration',
  requireAnswers('applicantDetails', 'landHoldingDetails', 'seedPotatoVariety'),
  stockDeclarationController.post
);

// Step 6 of 6: check your answers, including "Change" links back to any
// earlier step and the (mocked) final submission.
router.get(
  '/check-your-answers',
  requireAnswers(
    'applicantDetails',
    'landHoldingDetails',
    'seedPotatoVariety',
    'stockDeclaration'
  ),
  checkYourAnswersController.get
);
router.post(
  '/check-your-answers',
  requireAnswers(
    'applicantDetails',
    'landHoldingDetails',
    'seedPotatoVariety',
    'stockDeclaration'
  ),
  checkYourAnswersController.post
);

// Confirmation page -- only reachable after the mocked submission above.
router.get('/confirmation', requireSubmitted, confirmationController.get);

module.exports = router;