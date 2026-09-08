'use strict';

const http = require('http');
const https = require('https');
const request = require('supertest');
const app = require('../server');

const DEMO_BANNER_TEXT = 'DEMO -- not a live service';

const VALID_APPLICANT_DETAILS = {
  fullName: 'Alex Fenwick',
  businessName: 'Fenwick Seed Potatoes',
  emailAddress: 'alex.fenwick@example.com',
  telephoneNumber: '01234 567890'
};

const VALID_LAND_HOLDING_DETAILS = {
  holdingName: 'Fenwick Farm',
  addressLine1: '1 Potato Lane',
  townOrCity: 'Alnwick',
  postcode: 'SW1A 1AA',
  parcelReference: 'PARCEL-0001'
};

const VALID_SEED_POTATO_VARIETY_ON_LIST = {
  potatoClass: 'basic',
  varietyOnList: 'yes',
  varietyOtherDetails: ''
};

const VALID_SEED_POTATO_VARIETY_NOT_ON_LIST = {
  potatoClass: 'certified',
  varietyOnList: 'no',
  varietyOtherDetails: 'Maris Piper (fictional, not on the demo list)'
};

const VALID_STOCK_DECLARATION = {
  quantityOfSeedPotatoes: '12',
  'stockDeclarationDate-day': '5',
  'stockDeclarationDate-month': '4',
  'stockDeclarationDate-year': '2024'
};

/**
 * Reads the host/hostname a recorded http.request()/https.request() call
 * was made against, regardless of whether it was called with a URL
 * string, a URL object, or a plain options object -- the three shapes
 * Node's own http/https modules accept.
 */
function hostFromRequestCallArgs(callArgs) {
  const firstArg = callArgs[0];

  if (typeof firstArg === 'string') {
    return new URL(firstArg).hostname;
  }

  if (firstArg instanceof URL) {
    return firstArg.hostname;
  }

  if (firstArg && typeof firstArg === 'object') {
    return firstArg.hostname || firstArg.host;
  }

  return undefined;
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', undefined]);

describe('full SPCS2 demo journey', () => {
  // Every low-level network call this process makes during the whole
  // journey below is recorded here. supertest itself talks to this app
  // over a real (but entirely local) HTTP socket, so http.request() is
  // expected to be called -- what matters, per acceptance criterion 4
  // ("verifiable by inspecting network calls -- none leave the
  // container/local environment"), is that every single one of those
  // calls stays local, and that https.request() (which nothing in this
  // demo has any legitimate reason to use) is never called at all.
  let httpRequestSpy;
  let httpsRequestSpy;

  beforeAll(() => {
    httpRequestSpy = jest.spyOn(http, 'request');
    httpsRequestSpy = jest.spyOn(https, 'request');
  });

  afterAll(() => {
    httpRequestSpy.mockRestore();
    httpsRequestSpy.mockRestore();
  });

  describe('sequential Continue navigation, check-your-answers, and mocked confirmation', () => {
    const agent = request.agent(app);

    it('starts at the start page', async () => {
      const response = await agent.get('/');

      expect(response.status).toBe(200);
      expect(response.text).toContain(DEMO_BANNER_TEXT);
      expect(response.text).toContain('Start now');
    });

    it('submits applicant-details and is sent on to land-holding-details', async () => {
      const response = await agent
        .post('/applicant-details')
        .type('form')
        .send(VALID_APPLICANT_DETAILS);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/land-holding-details');
    });

    it('submits land-holding-details and is sent on to seed-potato-variety', async () => {
      const response = await agent
        .post('/land-holding-details')
        .type('form')
        .send(VALID_LAND_HOLDING_DETAILS);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/seed-potato-variety');
    });

    it('submits seed-potato-variety and is sent on to stock-declaration', async () => {
      const response = await agent
        .post('/seed-potato-variety')
        .type('form')
        .send(VALID_SEED_POTATO_VARIETY_ON_LIST);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/stock-declaration');
    });

    it('submits stock-declaration and is sent on to check-your-answers', async () => {
      const response = await agent
        .post('/stock-declaration')
        .type('form')
        .send(VALID_STOCK_DECLARATION);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/check-your-answers');
    });

    it('renders check-your-answers with every previously entered value and a working Change link back to each step', async () => {
      const response = await agent.get('/check-your-answers');

      expect(response.status).toBe(200);
      expect(response.text).toContain(DEMO_BANNER_TEXT);
      expect(response.text).toContain('Check your answers');

      // Applicant details section: every entered value present...
      expect(response.text).toContain('Alex Fenwick');
      expect(response.text).toContain('Fenwick Seed Potatoes');
      expect(response.text).toContain('alex.fenwick@example.com');
      expect(response.text).toContain('01234 567890');
      // ...each with a Change link back to the owning step and field.
      expect(response.text).toContain('href="/applicant-details#fullName"');
      expect(response.text).toContain('href="/applicant-details#businessName"');
      expect(response.text).toContain('href="/applicant-details#emailAddress"');
      expect(response.text).toContain('href="/applicant-details#telephoneNumber"');

      // Land holding details section.
      expect(response.text).toContain('Fenwick Farm');
      expect(response.text).toContain('1 Potato Lane');
      expect(response.text).toContain('Alnwick');
      expect(response.text).toContain('SW1A 1AA');
      expect(response.text).toContain('PARCEL-0001');
      expect(response.text).toContain('href="/land-holding-details#holdingName"');
      expect(response.text).toContain('href="/land-holding-details#addressLine1"');
      expect(response.text).toContain('href="/land-holding-details#townOrCity"');
      expect(response.text).toContain('href="/land-holding-details#postcode"');
      expect(response.text).toContain('href="/land-holding-details#parcelReference"');

      // Seed potato variety and class section.
      expect(response.text).toContain('Basic');
      expect(response.text).toContain('href="/seed-potato-variety#potatoClass"');
      expect(response.text).toContain('href="/seed-potato-variety#varietyOnList"');
      // No trigger was hit ("yes" was answered), so the conditional
      // "specify the variety" row should not be rendered at all here.
      expect(response.text).not.toContain('Variety name (if not on the list)');

      // Stock declaration section.
      expect(response.text).toContain('12');
      expect(response.text).toContain('5 April 2024');
      expect(response.text).toContain('href="/stock-declaration#quantityOfSeedPotatoes"');
      expect(response.text).toContain('href="/stock-declaration#stockDeclarationDate-day"');

      expect(response.text).toContain('Confirm and send');
    });

    it('mocks the final submission and shows a mocked reference number on the confirmation page', async () => {
      const postResponse = await agent.post('/check-your-answers').type('form').send({});

      expect(postResponse.status).toBe(302);
      expect(postResponse.headers.location).toBe('/confirmation');

      const getResponse = await agent.get('/confirmation');

      expect(getResponse.status).toBe(200);
      expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
      expect(getResponse.text).toContain('Application submitted');
      expect(getResponse.text).toMatch(/SPCS2-[A-Z0-9]{4}-[A-Z0-9]{4}/);
      expect(getResponse.text).toContain('no real application was submitted');
    });

    it('clears the session after confirmation, so the journey must be started again from scratch', async () => {
      const confirmationAgainResponse = await agent.get('/confirmation');

      expect(confirmationAgainResponse.status).toBe(302);
      expect(confirmationAgainResponse.headers.location).toBe('/check-your-answers');

      const checkYourAnswersResponse = await agent.get('/check-your-answers');

      expect(checkYourAnswersResponse.status).toBe(302);
      expect(checkYourAnswersResponse.headers.location).toBe('/applicant-details');
    });
  });

  describe('conditional field surfaces its own Change link on check-your-answers', () => {
    const agent = request.agent(app);

    it('walks the journey answering "no" to the variety-on-list question, with the dependent field filled in', async () => {
      await agent.post('/applicant-details').type('form').send(VALID_APPLICANT_DETAILS);
      await agent.post('/land-holding-details').type('form').send(VALID_LAND_HOLDING_DETAILS);
      await agent
        .post('/seed-potato-variety')
        .type('form')
        .send(VALID_SEED_POTATO_VARIETY_NOT_ON_LIST);
      await agent.post('/stock-declaration').type('form').send(VALID_STOCK_DECLARATION);

      const response = await agent.get('/check-your-answers');

      expect(response.status).toBe(200);
      expect(response.text).toContain('Variety name (if not on the list)');
      expect(response.text).toContain(
        'Maris Piper (fictional, not on the demo list)'
      );
      expect(response.text).toContain(
        'href="/seed-potato-variety#varietyOtherDetails"'
      );
    });
  });

  it('never makes any network call that leaves the local environment', () => {
    expect(httpsRequestSpy).not.toHaveBeenCalled();

    for (const callArgs of httpRequestSpy.mock.calls) {
      const host = hostFromRequestCallArgs(callArgs);

      expect(LOCAL_HOSTS.has(host)).toBe(true);
    }
  });
});