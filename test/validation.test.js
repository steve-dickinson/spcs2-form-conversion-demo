'use strict';

const {
  isBlank,
  isPresent,
  isValidPostcode,
  isRealCalendarDate,
  isFutureDate,
  isConditionallyRequiredAndMissing
} = require('../app/validation/rules');

describe('isBlank / isPresent', () => {
  it('treats undefined, null, empty string and whitespace-only as blank', () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank('')).toBe(true);
    expect(isBlank('   ')).toBe(true);
  });

  it('treats a non-empty trimmed string as present', () => {
    expect(isBlank('Alex Fenwick')).toBe(false);
    expect(isPresent('Alex Fenwick')).toBe(true);
    expect(isPresent('   ')).toBe(false);
  });
});

describe('isValidPostcode (acceptance criterion 3: postcode format check)', () => {
  it('accepts well-formed UK postcodes in various common shapes', () => {
    expect(isValidPostcode('SW1A 1AA')).toBe(true);
    expect(isValidPostcode('sw1a 1aa')).toBe(true);
    expect(isValidPostcode('M1 1AE')).toBe(true);
    expect(isValidPostcode('CR2  6XH')).toBe(true);
    expect(isValidPostcode('DN551PT')).toBe(true);
  });

  it('rejects bad-input examples: blank, missing inward code, and nonsense text', () => {
    expect(isValidPostcode('')).toBe(false);
    expect(isValidPostcode('   ')).toBe(false);
    expect(isValidPostcode('NOTAPOSTCODE')).toBe(false);
    expect(isValidPostcode('SW1A')).toBe(false);
    expect(isValidPostcode('12345')).toBe(false);
  });
});

describe('isRealCalendarDate (acceptance criterion 3: invalid date check)', () => {
  it('accepts real calendar dates, including a leap-year 29 February', () => {
    expect(isRealCalendarDate({ day: '5', month: '4', year: '2024' })).toBe(true);
    expect(isRealCalendarDate({ day: '29', month: '2', year: '2024' })).toBe(true);
  });

  it('rejects bad-input examples: 31 April, 29 Feb in a non-leap year, and non-numeric parts', () => {
    // April only has 30 days.
    expect(isRealCalendarDate({ day: '31', month: '4', year: '2024' })).toBe(false);
    // 2023 is not a leap year.
    expect(isRealCalendarDate({ day: '29', month: '2', year: '2023' })).toBe(false);
    // Month out of range.
    expect(isRealCalendarDate({ day: '10', month: '13', year: '2024' })).toBe(false);
    // Non-numeric input.
    expect(isRealCalendarDate({ day: 'abc', month: '4', year: '2024' })).toBe(false);
    // Missing parts.
    expect(isRealCalendarDate({ day: '', month: '', year: '' })).toBe(false);
    // Non-4-digit year.
    expect(isRealCalendarDate({ day: '5', month: '4', year: '24' })).toBe(false);
  });
});

describe('isFutureDate (acceptance criterion 3: future date check)', () => {
  const REFERENCE_DATE = new Date(2024, 3, 5); // 5 April 2024

  it('rejects a bad-input example: a date after the reference date', () => {
    expect(
      isFutureDate({ day: '6', month: '4', year: '2024' }, REFERENCE_DATE)
    ).toBe(true);
    expect(
      isFutureDate({ day: '1', month: '1', year: '2025' }, REFERENCE_DATE)
    ).toBe(true);
  });

  it('accepts today and past dates as not-future', () => {
    expect(
      isFutureDate({ day: '5', month: '4', year: '2024' }, REFERENCE_DATE)
    ).toBe(false);
    expect(
      isFutureDate({ day: '4', month: '4', year: '2024' }, REFERENCE_DATE)
    ).toBe(false);
    expect(
      isFutureDate({ day: '1', month: '1', year: '2020' }, REFERENCE_DATE)
    ).toBe(false);
  });

  it('treats a date that is not a real calendar date as not-future (invalid, not future)', () => {
    expect(
      isFutureDate({ day: '31', month: '4', year: '2024' }, REFERENCE_DATE)
    ).toBe(false);
  });
});

describe('isConditionallyRequiredAndMissing (acceptance criterion 3: conditional-required field)', () => {
  it('flags a bad-input example: trigger answered "no" but dependent field left blank', () => {
    expect(
      isConditionallyRequiredAndMissing('no', ['no'], '')
    ).toBe(true);
    expect(
      isConditionallyRequiredAndMissing('no', ['no'], '   ')
    ).toBe(true);
    expect(
      isConditionallyRequiredAndMissing('no', ['no'], undefined)
    ).toBe(true);
  });

  it('does not flag an error when the trigger value is answered "no" and the dependent field is filled in', () => {
    expect(
      isConditionallyRequiredAndMissing('no', ['no'], 'Maris Piper')
    ).toBe(false);
  });

  it('does not flag an error when the trigger value does not require the dependent field', () => {
    expect(
      isConditionallyRequiredAndMissing('yes', ['no'], '')
    ).toBe(false);
    expect(
      isConditionallyRequiredAndMissing(undefined, ['no'], '')
    ).toBe(false);
  });
});