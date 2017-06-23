'use strict';
const snoowrap = require('snoowrap');
const stripBom = require('strip-bom');
const fse = require('fs-extra');

const loader = (configFile, oauth2File) => Promise.all([
  config(configFile),
  oauth2(oauth2File)
]);

const config = (path) => fse.readJson(path);
const oauth2 = (path) => fse.readJson(path);

const predeploy = ([config, oauth2]) => Promise.all([
  config,
  client(config, oauth2).getSubreddit(config.target.subreddit),
  stylesheet(config)
])

const client = (config, oauth2) => new snoowrap({
  userAgent: config.snoowrap.userAgent,
  clientId: config.snoowrap.clientId,
  clientSecret: config.snoowrap.clientSecret,
  refreshToken: oauth2.refresh_token,
});

const stylesheet = (config) => fse
  .readFile(config.stylesheet.file, config.stylesheet.encoding)
  .then(stripBom);

const deploy = ([config, subreddit, css]) => subreddit
  .updateStylesheet({
    'reason': 'testing script 1',
    css,
  });

loader('./config.json', './oauth2.json')
  .then(predeploy)
  .then(deploy)
  .then((res) => console.log('success'))
  .catch((res) => console.log(res));
