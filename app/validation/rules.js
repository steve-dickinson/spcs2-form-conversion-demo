'use strict';

/**
 * Reusable, pure validation functions shared by every per-page schema in
 * app/validation/schemas.js. Nothing in this file knows about Express,
 * sessions, or Nunjucks -- each function takes plain values (strings,
 * or small plain objects for date parts) and returns a plain boolean or
 * plain data, so it can be unit tested in isolation (see
 * test/validation.test.js) and composed freely by schemas.js.
 *
 * None of this talks to a database, a file, or the network -- it is all
 * synchronous, in-memory string/number checking, matching the rest of
 * this demo's "no real backend" scope.
 */

/**
 * True if `value` is missing, null/undefined, or contains only
 * whitespace once trimmed. Used both as the basis of "required field"
 * checks and as a building block for the conditional-required logic
 * below.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isBlank(value) {
  if (value === undefined || value === null) {
    return true;
  }

  return String(value).trim().length === 0;
}

/**
 * True if `value` is present (the inverse of isBlank). Provided
 * alongside isBlank so callers/tests can read whichever direction is
 * clearer at the call site.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPresent(value) {
  return !isBlank(value);
}

/**
 * Standard GOV.UK-style UK postcode format check.
 *
 * Accepts the usual outward+inward code shapes (e.g. "SW1A 1AA",
 * "M1 1AE", "CR2 6XH", "DN55 1PT") case-insensitively, with either a
 * single space, no space, or extra surrounding whitespace between the
 * outward and inward parts -- all of which are normalised away before
 * the format itself is checked. This intentionally checks *shape* only
 * (it does not call any real postcode-lookup API, per this demo's
 * "no real backend" scope) -- exactly what a legacy paper form's
 * "enter your postcode" field implies as a validation rule.
 *
 * @param {unknown} value
 * @returns {boolean} true if `value` is a plausible UK postcode format
 */
function isValidPostcode(value) {
  if (isBlank(value)) {
    return false;
  }

  const normalised = String(value).trim().toUpperCase().replace(/\s+/g, ' ');

  const POSTCODE_PATTERN = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/;

  return POSTCODE_PATTERN.test(normalised);
}

/**
 * Coerces a single date-part string (day, month, or year as typed into
 * a GOV.UK date input) into an integer, or null if it isn't a clean
 * whole number (rejects blanks, "1.5", "abc", "1e3", etc.).
 *
 * @param {unknown} part
 * @returns {number|null}
 */
function toWholeNumber(part) {
  if (isBlank(part)) {
    return null;
  }

  const trimmed = String(part).trim();

  if (!/^[0-9]+$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

/**
 * Checks that `{ day, month, year }` (the shape produced by a GOV.UK
 * date input's three text fields) describes a date that actually
 * exists on the calendar -- e.g. rejects day=31/month=4 (April has 30
 * days) and day=29/month=2/year=2023 (not a leap year), not just
 * "day is a number between 1 and 31".
 *
 * Does not consider whether the date is past/future/allowed -- see
 * isFutureDate for that, which is a separate, composable rule.
 *
 * @param {{ day: unknown, month: unknown, year: unknown }} dateParts
 * @returns {boolean} true if all three parts are present and form a
 *   real calendar date
 */
function isRealCalendarDate({ day, month, year } = {}) {
  const dayNumber = toWholeNumber(day);
  const monthNumber = toWholeNumber(month);
  const yearNumber = toWholeNumber(year);

  if (dayNumber === null || monthNumber === null || yearNumber === null) {
    return false;
  }

  if (monthNumber < 1 || monthNumber > 12) {
    return false;
  }

  if (dayNumber < 1 || dayNumber > 31) {
    return false;
  }

  // GOV.UK date inputs conventionally take a 4-digit year; anything
  // shorter/longer is treated as invalid rather than guessed at.
  if (String(yearNumber).length !== 4) {
    return false;
  }

  // Construct the date and read the parts back: JavaScript's Date
  // silently "rolls over" out-of-range values (e.g. 31 April becomes
  // 1 May), so comparing the round-tripped parts against the original
  // input is what actually catches non-existent calendar dates such as
  // 31 April or 29 February in a non-leap year.
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);

  return (
    date.getFullYear() === yearNumber &&
    date.getMonth() === monthNumber - 1 &&
    date.getDate() === dayNumber
  );
}

/**
 * True if `{ day, month, year }` is a real calendar date that falls
 * strictly after `referenceDate` (defaulting to "now"), i.e. a future
 * date. Callers combine this with isRealCalendarDate to decide whether
 * to reject a date as invalid-or-future -- for example a stock
 * declaration date, which a real applicant cannot plausibly be
 * declaring for a day that hasn't happened yet.
 *
 * Returns false (not future) for anything that isn't a real calendar
 * date in the first place -- callers should check isRealCalendarDate
 * separately if they need to distinguish "invalid" from "valid but in
 * the future".
 *
 * @param {{ day: unknown, month: unknown, year: unknown }} dateParts
 * @param {Date} [referenceDate]
 * @returns {boolean}
 */
function isFutureDate({ day, month, year } = {}, referenceDate = new Date()) {
  if (!isRealCalendarDate({ day, month, year })) {
    return false;
  }

  const dayNumber = toWholeNumber(day);
  const monthNumber = toWholeNumber(month);
  const yearNumber = toWholeNumber(year);

  const candidate = new Date(yearNumber, monthNumber - 1, dayNumber);

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  return candidate.getTime() > today.getTime();
}

/**
 * Conditional-required logic: decides whether a follow-up field's
 * emptiness should count as a validation error, based on a preceding
 * answer.
 *
 * This models the paper-form pattern of "if you ticked X above, you
 * must also tell us Y" -- e.g. on the seed potato variety & class step,
 * answering that stock includes a variety not on the standard list
 * (the trigger) makes the free-text "please specify the variety" field
 * (the dependent field) required, where it is otherwise optional.
 *
 * @param {unknown} triggerValue - the value of the preceding
 *   radio/checkbox answer that governs whether the dependent field is
 *   required (e.g. req.body.varietyOnList).
 * @param {unknown[]} triggerValuesThatRequireField - the set of
 *   trigger values which, if matched, make the dependent field required
 *   (e.g. ['no']).
 * @param {unknown} dependentFieldValue - the value submitted for the
 *   dependent field (e.g. req.body.varietyOtherDetails).
 * @returns {boolean} true if the dependent field IS required by the
 *   trigger AND is currently blank -- i.e. true means "this is a
 *   validation error", matching the naming/shape of the other
 *   predicate functions in this file.
 */
function isConditionallyRequiredAndMissing(
  triggerValue,
  triggerValuesThatRequireField,
  dependentFieldValue
) {
  const isTriggered = triggerValuesThatRequireField.includes(triggerValue);

  if (!isTriggered) {
    return false;
  }

  return isBlank(dependentFieldValue);
}

module.exports = {
  isBlank,
  isPresent,
  isValidPostcode,
  isRealCalendarDate,
  isFutureDate,
  isConditionallyRequiredAndMissing
};