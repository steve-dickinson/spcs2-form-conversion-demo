'use strict';

/**
 * Confirmation page -- the final step of the journey (step 6 of 6, shown
 * only after a mocked submission from app/controllers/check-your-answers.js).
 *
 * Only reachable once req.session.submitted has been set, which
 * app/router.js enforces via its requireSubmitted guard before this
 * handler is ever called -- so by the time we get here, both
 * req.session.submitted and req.session.referenceNumber are guaranteed to
 * have been populated by check-your-answers' POST handler.
 *
 * This page displays that mocked reference number (see
 * app/data/mock-reference.js for how it was generated -- locally, with
 * no network call of any kind) and then clears the session, so refreshing
 * or revisiting this page, or any earlier step, afterwards starts a
 * completely fresh, empty journey rather than carrying over stale mock
 * answers. No real submission has occurred anywhere in this codebase --
 * this is a fictional demo persona's mock data only, with no affiliation
 * to Defra, APHA, or any real classification scheme.
 */

function get(req, res, next) {
  const referenceNumber = (req.session && req.session.referenceNumber) || null;

  // Render (without auto-sending) so the reference number captured above
  // -- read from the session before it's destroyed -- is what actually
  // ends up on the page, then send the response, then clear the session.
  res.render('confirmation.njk', { referenceNumber }, (err, html) => {
    if (err) {
      return next(err);
    }

    res.send(html);

    if (req.session) {
      req.session.destroy(() => {
        // Nothing to do on completion: this is a best-effort, in-memory
        // cleanup only (see app/middleware/session.js) -- there is no
        // database or external store to reconcile, and the response has
        // already been sent to the browser above.
      });
    }

    return undefined;
  });
}

module.exports = { get };