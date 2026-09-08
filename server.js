'use strict';

const express = require('express');
const path = require('path');

const configureNunjucks = require('./app/config/nunjucks');
const router = require('./app/router');
const createSessionMiddleware = require('./app/middleware/session');

const app = express();

app.set('trust proxy', 1);

configureNunjucks(app, [
  path.join(__dirname, 'app/views'),
  path.join(__dirname, 'node_modules/govuk-frontend/dist')
]);

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'node_modules/govuk-frontend/dist')));

// Session middleware is built and configured in one place --
// app/middleware/session.js -- rather than duplicated inline here, so
// there is exactly one definition of the session secret/cookie settings
// for this demo to keep secure (see that file for details on why the
// secret is never a hardcoded literal and why the cookie sets an
// explicit path).
app.use(createSessionMiddleware());

app.use((req, res, next) => {
  res.locals.demoBanner = 'DEMO -- not a live service';
  next();
});

app.use('/', router);

const HOST = '0.0.0.0';
const PORT = 8000;

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`SPCS2 demo service listening on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
