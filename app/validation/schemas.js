'use strict';

const {
  isBlank,
  isValidPostcode,
  isRealCalendarDate,
  isFutureDate,
  isConditionallyRequiredAndMissing
} = require('./rules');

/**
 * Per-page validation schemas.
 *
 * Each schema is an ordered array of "field descriptors". Order matters:
 * it is both the order the fields appear on the page and the order the
 * resulting errors are listed in the GDS error summary component (GDS
 * convention: the error summary lists errors in the same order as the
 * fields on the page, and each summary link jumps to the first invalid
 * field, not necessarily every invalid field for a multi-part input).
 *
 * A field descriptor has the shape:
 *
 *   {
 *     name: string        - the req.body key this field's value lives
 *                            under (for `type: 'date'` fields, this is the
 *                            shared prefix of the three GOV.UK date input
 *                            sub-fields, e.g. `${name}-day`).
 *     type: 'text' | 'radios' | 'date'
 *     errorHref: string    - the DOM id the error summary link for this
 *                            field should jump to. For 'date' fields this
 *                            is conventionally the day input's id, per GDS
 *                            date input guidance.
 *     validate(body): string | null
 *                          - returns a human-readable error message if the
 *                            field is invalid, or null if it's valid. Given
 *                            the *whole* parsed request body (not just this
 *                            field's own value) so conditional fields can
 *                            read a preceding answer elsewhere on the page.
 *   }
 *
 * None of this talks to Express, sessions, or Nunjucks directly -- it only
 * consumes the pure functions in app/validation/rules.js plus plain
 * request-body objects, so it can be unit tested in isolation (see
 * test/validation.test.js) and reused by every controller in
 * app/controllers/*.
 */

/**
 * Builds a simple "must not be blank" text field descriptor.
 *
 * @param {string} name - req.body key
 * @param {string} label - used mid-sentence, e.g. "Enter <label>"
 * @param {string} [errorHref] - defaults to `name`
 */
function requiredText(name, label, errorHref) {
  return {
    name,
    type: 'text',
    errorHref: errorHref || name,
    validate(body) {
      if (isBlank(body[name])) {
        return `Enter ${label}`;
      }

      return null;
    }
  };
}

/**
 * Builds a simple "must have a radio option selected" field descriptor.
 * GOV.UK Design System convention: the first radio in a group is given
 * `id="<name>"`, so that's what the error summary link should jump to.
 *
 * @param {string} name - req.body key
 * @param {string} label - used mid-sentence, e.g. "Select <label>"
 */
function requiredRadio(name, label) {
  return {
    name,
    type: 'radios',
    errorHref: name,
    validate(body) {
      if (isBlank(body[name])) {
        return `Select ${label}`;
      }

      return null;
    }
  };
}

/**
 * Builds a GOV.UK date input field descriptor (three sub-fields:
 * `${name}-day`, `${name}-month`, `${name}-year`).
 *
 * @param {string} name - shared prefix of the three date sub-field names
 * @param {string} label - used mid-sentence, e.g. "Enter <label>"
 * @param {{ allowFuture?: boolean }} [options] - set `allowFuture: true`
 *   to skip the invalid/future-date check (not used by this demo's own
 *   schemas below, but kept configurable since not every date a legacy
 *   form asks for is necessarily barred from being in the future).
 */
function requiredDate(name, label, options = {}) {
  const allowFuture = options.allowFuture === true;

  return {
    name,
    type: 'date',
    errorHref: `${name}-day`,
    validate(body) {
      const dateParts = {
        day: body[`${name}-day`],
        month: body[`${name}-month`],
        year: body[`${name}-year`]
      };

      if (isBlank(dateParts.day) && isBlank(dateParts.month) && isBlank(dateParts.year)) {
        return `Enter ${label}`;
      }

      if (!isRealCalendarDate(dateParts)) {
        return `${label} must be a real date`;
      }

      if (!allowFuture && isFutureDate(dateParts)) {
        return `${label} must be today or in the past`;
      }

      return null;
    }
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Per-page schemas, keyed by the same `sessionKey` names used throughout
 * app/router.js (`applicantDetails`, `landHoldingDetails`,
 * `seedPotatoVariety`, `stockDeclaration`) so a controller can look its
 * own schema up by that one shared name.
 */
const schemas = {
  /**
   * Step 2 of 6: applicant / business details. Demonstrates plain
   * required-field validation (acceptance criterion 2).
   */
  applicantDetails: [
    requiredText('fullName', 'your full name'),
    requiredText('businessName', 'your business or holding name'),
    {
      name: 'emailAddress',
      type: 'text',
      errorHref: 'emailAddress',
      validate(body) {
        if (isBlank(body.emailAddress)) {
          return 'Enter your email address';
        }

        if (!EMAIL_PATTERN.test(String(body.emailAddress).trim())) {
          return 'Enter an email address in the correct format, like name@example.com';
        }

        return null;
      }
    },
    requiredText('telephoneNumber', 'your telephone number')
  ],

  /**
   * Step 3 of 6: land parcel / holding details. Demonstrates the
   * postcode format check (acceptance criterion 3).
   */
  landHoldingDetails: [
    requiredText('holdingName', 'the name of the land holding'),
    requiredText('addressLine1', 'the first line of the address'),
    requiredText('townOrCity', 'a town or city'),
    {
      name: 'postcode',
      type: 'text',
      errorHref: 'postcode',
      validate(body) {
        if (isBlank(body.postcode)) {
          return 'Enter a postcode';
        }

        if (!isValidPostcode(body.postcode)) {
          return 'Enter a full UK postcode, like SW1A 1AA';
        }

        return null;
      }
    },
    requiredText('parcelReference', 'the land parcel reference number')
  ],

  /**
   * Step 4 of 6: seed potato variety & class. Demonstrates the
   * conditional-required field (acceptance criterion 3): the
   * "varietyOnList" radio question triggers "varietyOtherDetails" only
   * when answered "no", matching the paper form's "if not on the list,
   * tell us the variety" branching question.
   */
  seedPotatoVariety: [
    requiredRadio('potatoClass', 'the seed potato class'),
    requiredRadio(
      'varietyOnList',
      'whether the variety is on the classified variety list'
    ),
    {
      name: 'varietyOtherDetails',
      type: 'text',
      errorHref: 'varietyOtherDetails',
      validate(body) {
        const isMissing = isConditionallyRequiredAndMissing(
          body.varietyOnList,
          ['no'],
          body.varietyOtherDetails
        );

        if (isMissing) {
          return 'Enter the name of the seed potato variety';
        }

        return null;
      }
    }
  ],

  /**
   * Step 5 of 6: stock declaration. Demonstrates the invalid/future date
   * check (acceptance criterion 3): a stock declaration cannot plausibly
   * be dated in the future.
   */
  stockDeclaration: [
    {
      name: 'quantityOfSeedPotatoes',
      type: 'text',
      errorHref: 'quantityOfSeedPotatoes',
      validate(body) {
        if (isBlank(body.quantityOfSeedPotatoes)) {
          return 'Enter the quantity of seed potatoes, in tonnes';
        }

        if (!/^[0-9]+$/.test(String(body.quantityOfSeedPotatoes).trim())) {
          return 'Quantity of seed potatoes must be a whole number';
        }

        return null;
      }
    },
    requiredDate('stockDeclarationDate', 'the date of this stock declaration')
  ]
};

/**
 * Runs every field descriptor in `schema` against `body` and builds the
 * two shapes every controller needs: a flat, page-order list for the GDS
 * error summary partial, and a lookup by field name for inline errors
 * next to each offending field. Both are built in one pass, so all
 * errors on the page are reported together rather than one at a time
 * (acceptance criterion 2).
 *
 * @param {Array<object>} schema - one of the arrays in `schemas` above
 * @param {Record<string, unknown>} body - the parsed req.body
 * @returns {{
 *   hasErrors: boolean,
 *   errorList: Array<{ text: string, href: string }>,
 *   errorMap: Record<string, { text: string }>
 * }}
 */
function validateAnswers(schema, body) {
  const errorList = [];
  const errorMap = {};

  for (const field of schema) {
    const message = field.validate(body || {});

    if (message) {
      errorList.push({ text: message, href: `#${field.errorHref}` });
      errorMap[field.name] = { text: message };
    }
  }

  return {
    hasErrors: errorList.length > 0,
    errorList,
    errorMap
  };
}

module.exports = {
  schemas,
  validateAnswers
};