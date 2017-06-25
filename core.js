'use strict';
const snoowrap = require('snoowrap');
const stripBom = require('strip-bom');
const fse = require('fs-extra');
const reqOauth2 = require('./reqOauth2');

// Promised Object
const promised = (obj) => {
  var keys = Object.keys(obj);
  return Promise.all(keys.map(k => obj[k]))
    .then(values => values.reduce(reductor(keys), {}));
}
const reductor = (keys) => (obj, val, index) => Object.assign(obj, { [keys[index]]: val });

// Snoowrap Client
const client = ({ config, clientConfig, oauth2 }) =>
  new snoowrap({
    userAgent: config.client.userAgent,
    clientId: clientConfig.clientId,
    clientSecret: clientConfig.clientSecret,
    refreshToken: oauth2.refresh_token,
  });

// File Loaders
const loadConfig = (path) => {
  console.log(`Loading configuration from ${path}`);
  return fse.readJson(path).then(config => ({ config }));
};

const loadClientConfig = ({ config }) => {
  console.log(`Loading client configuration from ${config.client.file}`);
  return fse.readJson(config.client.file)
    .then((clientConfig) => promised({
      config,
      clientConfig,
    }));
}

const loadOauth2 = ({ config }) => {
  console.log(`Loading oauth2 credentials from ${config.oauth2.file}`);
  return fse.readJson(config.oauth2.file);
}

const loadSettings = (configFile) =>
  loadConfig(configFile)
  .then(loadClientConfig)
  .then(({ config, clientConfig }) => promised({
    config,
    clientConfig,
    oauth2: loadOrRequestOauth2({ config, clientConfig }),
    stylesheet: loadStylesheet({ config }),
  }));

const loadStylesheet = ({ config }) => {
  console.log(`Loading stylesheet at ${config.stylesheet.file}`);
  fse.readFile(config.stylesheet.file, config.stylesheet.encoding)
    .then(stripBom);
}

// Oauth2 Requester
const loadOrRequestOauth2 = ({ config, clientConfig }) =>
  loadOauth2({ config })
  .catch(error =>  {
    console.log('No oauth2 credentials found. Requesting credentials from Reddit.com');
    return requestOauth2({ config, clientConfig });
  });

const requestOauth2 = ({ config, clientConfig }) =>
  reqOauth2.request({
    clientId: clientConfig.clientId,
    clientSecret: clientConfig.clientSecret,
    duration: config.oauth2.duration,
    scope: config.oauth2.scope,
  })
  .then((data) =>
    fse.writeJson(config.oauth2.file, data)
    .then(() => data)
  );

// Actions
const deployStylesheet = ({ config, clientConfig, oauth2, css }) =>
  client({ config, clientConfig, oauth2 })
  .getSubreddit(config.target.subreddit)
  .updateStylesheet({ reason: 'testing script 1', css });

const fullDeploy = configFile =>
  loadSettings(configFile)
  // .then(deployImages)
  .then(deployStylesheet)
  // .then(deployFlairs)
  // .then(deploySidebar)
  .then((res) => {
    console.log('success');

  })
  .catch((res) => console.log(res));


module.exports = {
  loadSettings,
  loadConfig,
  loadOauth2,
  loadStylesheet,
  loadOrRequestOauth2,
  requestOauth2,
  deployStylesheet,
  fullDeploy,
}
