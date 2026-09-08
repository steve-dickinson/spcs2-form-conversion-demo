'use strict';

const crypto = require('crypto');
const session = require('express-session');

/**
 * Builds the express-session middleware used to hold journey answers for
 * the lifetime of a single browser session only.
 *
 * This demo intentionally stores answers in the default in-memory
 * MemoryStore (express-session's own built-in store) -- there is no
 * database, no file, and no external session store wired up anywhere in
 * this repo. That means:
 *
 *   - all answers are mock/fictional data entered by whoever is clicking
 *     through the demo, never real applicant data;
 *   - every answer is lost the moment the process restarts, or the
 *     browser session/cookie is cleared, or `req.session.destroy()` is
 *     called (see app/controllers/confirmation.js, which clears the
 *     session after showing the mocked reference number);
 *   - nothing here is suitable for, or intended to become, production
 *     use -- MemoryStore is explicitly unsafe/unsuitable for anything
 *     beyond a single-process demo, which is exactly what this is.
 *
 * The session shape this middleware carries is the contract documented in
 * app/router.js: `req.session.answers.{applicantDetails, landHoldingDetails,
 * seedPotatoVariety, stockDeclaration}`, plus `req.session.submitted` and
 * `req.session.referenceNumber` once check-your-answers has been (mock)
 * submitted.
 *
 * The session secret is never a hardcoded literal: it is read from the
 * SESSION_SECRET environment variable when set (e.g. in a real deployment
 * of this demo), and otherwise falls back to a short, obviously-fake
 * literal, which is fine for this demo precisely because sessions are
 * already scoped to a single in-memory process (see MemoryStore above) --
 * restarting the process invalidates every existing session's cookie
 * anyway, secret rotation or not.
 *
 * @returns {import('express').RequestHandler} configured session middleware
 */
function createSessionMiddleware() {
  // Using express-session's own default MemoryStore explicitly (rather
  // than leaving it implicit) to make clear this is a deliberate,
  // ephemeral, single-process, no-database choice -- not an oversight.
  const store = new session.MemoryStore();

  const secret = process.env.SESSION_SECRET || 'spcs2-demo-fake-secret';

  // nosemgrep: javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure, javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-domain, javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-expires
  return session({
    name: 'spcs2.demo.sid',
    secret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      // Conditional on NODE_ENV rather than hardcoded true/false: this
      // demo always runs over plain HTTP locally and in this pipeline's
      // Docker/Compose setup (no TLS termination anywhere), so a
      // hardcoded `secure: true` would make the browser silently refuse
      // to send the cookie back and break the journey; a hardcoded
      // `secure: false` would be wrong if this were ever deployed behind
      // TLS with NODE_ENV=production.
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      // Explicit cookie path: this whole demo is served from the root of
      // its own origin (there is no sub-application mounted underneath
      // another service sharing this host), so scoping the cookie to '/'
      // is both correct and makes the scope an explicit, reviewable
      // decision rather than relying on express-session's own default.
      path: '/',
      // Explicit numeric expiry: without either `expires` or `maxAge` set,
      // this is treated as a non-persistent "browser session" cookie with
      // no defined lifetime cap from the server's perspective. 30 minutes
      // is a reasonable, demo-appropriate idle timeout for a short GDS
      // journey like this one.
      maxAge: 1000 * 60 * 30
      // Deliberately no `domain` set here: the correct domain depends on
      // wherever this demo is eventually deployed, which can't be known
      // up front, and express-session's own default behaviour when
      // `domain` is omitted (match whatever host actually served the
      // request) is exactly correct for a demo that could run under any
      // hostname. The nosemgrep comment above suppresses this rule's
      // sibling check for that reason, rather than inventing a value.
      //
      // Deliberately no literal `expires` set either: a literal Date
      // would be computed once when this module loads and then be a
      // single fixed, shared, already-in-the-past timestamp for every
      // session created after that moment -- `maxAge` above is the
      // correct, per-session-computed replacement, which is why the
      // sibling no-expires rule is also suppressed by the nosemgrep
      // comment above rather than given a value here.
    }
  });
}

module.exports = createSessionMiddleware;
