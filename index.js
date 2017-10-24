#!/usr/bin/env node
const core = require('./core');

core.fullDeploy('./config.json')
  .then(() => {
    console.log('Full deploy completed.');
  })
  .catch(error => {
    console.log('An error occurred:');
    console.log(error);
  });
