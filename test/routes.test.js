'use strict';

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

const VALID_SEED_POTATO_VARIETY = {
  potatoClass: 'basic',
  varietyOnList: 'yes',
  varietyOtherDetails: ''
};

const VALID_STOCK_DECLARATION = {
  quantityOfSeedPotatoes: '12',
  'stockDeclarationDate-day': '5',
  'stockDeclarationDate-month': '4',
  'stockDeclarationDate-year': '2024'
};

describe('GET /', () => {
  it('renders the start page with a 200 and the persistent DEMO banner', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toContain(DEMO_BANNER_TEXT);
    expect(response.text).toContain('Apply for seed potato classification');
    expect(response.text).toContain('Start now');
  });
});

describe('GET /applicant-details', () => {
  it('renders the applicant details page with a 200 and the DEMO banner', async () => {
    const response = await request(app).get('/applicant-details');

    expect(response.status).toBe(200);
    expect(response.text).toContain(DEMO_BANNER_TEXT);
    expect(response.text).toContain('Applicant and business details');
  });
});

describe('guarded steps requested out of sequence, with no session state', () => {
  it('redirects /land-holding-details back to /applicant-details', async () => {
    const response = await request(app).get('/land-holding-details');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/applicant-details');
  });

  it('redirects /seed-potato-variety back to /applicant-details', async () => {
    const response = await request(app).get('/seed-potato-variety');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/applicant-details');
  });

  it('redirects /stock-declaration back to /applicant-details', async () => {
    const response = await request(app).get('/stock-declaration');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/applicant-details');
  });

  it('redirects /check-your-answers back to /applicant-details', async () => {
    const response = await request(app).get('/check-your-answers');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/applicant-details');
  });

  it('redirects /confirmation back to /check-your-answers', async () => {
    const response = await request(app).get('/confirmation');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/check-your-answers');
  });
});

describe('full journey route rendering, in sequence, via a single session agent', () => {
  // Each of these routes is only reachable once the previous step's
  // Continue has succeeded (see app/router.js's requireAnswers guard), so
  // this test walks the whole journey with one cookie-carrying agent,
  // asserting every GET along the way renders 200 with expected content
  // and the persistent DEMO banner -- matching acceptance criterion 5
  // ("present and visible on every page of the journey").
  const agent = request.agent(app);

  it('walks applicant-details -> land-holding-details', async () => {
    const postResponse = await agent
      .post('/applicant-details')
      .type('form')
      .send(VALID_APPLICANT_DETAILS);

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/land-holding-details');

    const getResponse = await agent.get('/land-holding-details');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
    expect(getResponse.text).toContain('Land parcel and holding details');
  });

  it('walks land-holding-details -> seed-potato-variety', async () => {
    const postResponse = await agent
      .post('/land-holding-details')
      .type('form')
      .send(VALID_LAND_HOLDING_DETAILS);

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/seed-potato-variety');

    const getResponse = await agent.get('/seed-potato-variety');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
    expect(getResponse.text).toContain('Seed potato variety and class');
  });

  it('walks seed-potato-variety -> stock-declaration', async () => {
    const postResponse = await agent
      .post('/seed-potato-variety')
      .type('form')
      .send(VALID_SEED_POTATO_VARIETY);

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/stock-declaration');

    const getResponse = await agent.get('/stock-declaration');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
    expect(getResponse.text).toContain('Stock declaration');
  });

  it('walks stock-declaration -> check-your-answers', async () => {
    const postResponse = await agent
      .post('/stock-declaration')
      .type('form')
      .send(VALID_STOCK_DECLARATION);

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/check-your-answers');

    const getResponse = await agent.get('/check-your-answers');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
    expect(getResponse.text).toContain('Check your answers');
    expect(getResponse.text).toContain('Fenwick Seed Potatoes');
  });

  it('walks check-your-answers -> confirmation with a mocked reference number', async () => {
    const postResponse = await agent.post('/check-your-answers').type('form').send({});

    expect(postResponse.status).toBe(302);
    expect(postResponse.headers.location).toBe('/confirmation');

    const getResponse = await agent.get('/confirmation');

    expect(getResponse.status).toBe(200);
    expect(getResponse.text).toContain(DEMO_BANNER_TEXT);
    expect(getResponse.text).toContain('Application submitted');
    expect(getResponse.text).toMatch(/SPCS2-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  });
});