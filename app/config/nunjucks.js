'use strict';

const nunjucks = require('nunjucks');

/**
 * Configures Nunjucks as the view engine for the given Express app.
 *
 * @param {import('express').Express} app - the Express application instance
 * @param {string[]} paths - ordered list of directories Nunjucks should
 *   search for templates. This must include both this project's own
 *   app/views directory (for layout.njk, partials, and page templates)
 *   and the govuk-frontend dist directory (so `{% extends %}` /
 *   `{% include %}` can resolve the GOV.UK Frontend Nunjucks macros,
 *   e.g. govuk/components/button/macro.njk).
 */
function configureNunjucks(app, paths) {
  const env = nunjucks.configure(paths, {
    autoescape: true,
    express: app,
    // This process always runs as a single one-shot server (start, get
    // exercised, exit) inside Docker -- never as a live dev server anyone
    // edits templates against -- so template watching has nothing useful
    // to do here. Nunjucks' own default is already false, but it's set
    // explicitly to make the intent clear and to avoid ever depending on
    // the optional chokidar peer dependency that watch mode requires
    // (and which a plain `npm install` does not install).
    watch: false,
    noCache: process.env.NODE_ENV !== 'production'
  });

  app.set('view engine', 'njk');

  return env;
}

module.exports = configureNunjucks;