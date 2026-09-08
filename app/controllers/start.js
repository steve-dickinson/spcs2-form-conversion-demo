'use strict';

/**
 * Renders the start page (step 1 of 6): a short explanation of this demo
 * service plus a fictional persona used to complete the journey, and a
 * single "Start now" link into the first real step of the form
 * (applicant-details).
 *
 * This page never reads or writes req.session -- the journey's answers
 * object is only ever created once the applicant-details step's POST
 * succeeds (see app/router.js), so visiting the start page repeatedly, or
 * after a previous run, never carries over stale mock data.
 *
 * The persona below is entirely fictional and is provided only as a
 * suggestion for what to type into the form -- nothing on this page or
 * anywhere else in this repo reads real applicant data, and this demo is
 * not affiliated with, endorsed by, or representative of Defra or HM
 * Government.
 */

const PERSONA = {
  name: 'Alex Fenwick',
  businessName: 'Fenwick Seed Potatoes',
  description:
    'Alex runs a small seed potato holding in Northumberland and is ' +
    'applying, for demonstration purposes only, to have this season\'s ' +
    'stock classified under the fictional version of the Seed Potato ' +
    'Classification Scheme (SPCS2) used by this demo.'
};

function get(req, res) {
  res.render('start.njk', {
    persona: PERSONA
  });
}

module.exports = { get };