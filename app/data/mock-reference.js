'use strict';

const crypto = require('crypto');

/**
 * Generates a mocked confirmation reference number for this demo journey.
 *
 * This is entirely local, synchronous, and deterministic-in-shape-only --
 * it uses Node's built-in `crypto` module purely as a source of random
 * bytes and never opens a socket, makes an HTTP request, or talks to any
 * external system, database, or real DEFRA/APHA service. No real
 * submission of any kind occurs anywhere in this codebase; this function
 * exists solely so the confirmation page (app/controllers/confirmation.js)
 * has something reference-number-shaped to display, matching the pattern
 * a real GOV.UK service would use, without any of the real submission
 * machinery behind it.
 *
 * Format: SPCS2-XXXX-XXXX where each X is an uppercase letter or digit,
 * chosen from a set that excludes visually-ambiguous characters
 * (0/O, 1/I) -- the same convention GOV.UK services commonly use for
 * human-readable reference numbers that may need to be read aloud or
 * copied by hand.
 *
 * @returns {string} a mocked reference number, e.g. "SPCS2-7K4H-QX9M"
 */
function generateReferenceNumber() {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function randomSegment(length) {
    let segment = '';

    for (let i = 0; i < length; i += 1) {
      const index = crypto.randomInt(0, ALPHABET.length);
      segment += ALPHABET[index];
    }

    return segment;
  }

  return `SPCS2-${randomSegment(4)}-${randomSegment(4)}`;
}

module.exports = { generateReferenceNumber };