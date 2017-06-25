'use strict';
const snoowrap = require('snoowrap');
const stripBom = require('strip-bom');
const fse = require('fs-extra');
const reqOauth2 = require('./reqOauth2');

// Promised Object
const accretionAction = (action) => (data) => action(data).then((newData) => Object.assign({}, data, newData));
const readonlyAction = (action) => (data) => action(data).then(() => data);
const parallelAction = (obj) => {
  var keys = Object.keys(obj);
  return Promise.all(keys.map(k => obj[k]))
    .then(values => values.reduce(reductor(keys), {}));
}
const reductor = (keys) => (obj, val, index) => Object.assign(obj, { [keys[index]]: val });

// Snoowrap Client
const client = (data) => {
  const { config, clientConfig, oauth2 } = data;
  return new snoowrap({
    userAgent: config.client.userAgent,
    clientId: clientConfig.clientId,
    clientSecret: clientConfig.clientSecret,
    refreshToken: oauth2.refresh_token,
  });
}

// File Loaders
const loadSettings = (configFile) =>
  loadConfig(configFile)
    .then(loadClientConfig)
    .then(parallel);

const loadConfig = (path) => {
  console.log(`Loading configuration from ${path}`);
  return fse.readJson(path).then(config => ({ config }));
};

const loadClientConfig = accretionAction((data) => {
  const { config } = data;
  console.log(`Loading client configuration from ${config.client.file}`);
  return fse.readJson(config.client.file)
    .then((clientConfig) => ({ clientConfig }));
});

const parallel = accretionAction((data) => {
  return parallelAction({
    oauth2: loadOrRequestOauth2(data),
    css: loadStylesheet(data),
  });
});

const loadStylesheet = (data) => {
  const { config } = data;
  console.log(`Loading stylesheet at ${config.stylesheet.file}`);
  return fse.readFile(config.stylesheet.file, config.stylesheet.encoding)
    .then(stripBom);
};

// Oauth2 Requester
const loadOrRequestOauth2 = (data) =>
  loadOauth2(data)
    .catch(error =>  {
      console.log('No oauth2 credentials found.');
      console.log(data);
      return requestOauth2(data);
    });

const loadOauth2 = (data) => {
  const { config } = data;
  console.log(`Loading oauth2 credentials from ${config.oauth2.file}`);
  return fse.readJson(config.oauth2.file);
};


const requestOauth2 = (data) => {
  const { config, clientConfig } = data;
  console.log('Requesting credentials from Reddit.com');
  return reqOauth2.request({
    clientId: clientConfig.clientId,
    clientSecret: clientConfig.clientSecret,
    duration: config.oauth2.duration,
    scope: config.oauth2.scope,
  })
    .then(readonlyAction((data) =>
      fse.writeJson(config.oauth2.file, data)
    ));
};

// Actions
const deployStylesheet = readonlyAction((data) => {
  const { config, clientConfig, oauth2, css } = data;
  console.log('Deploying stylesheet');
  return client(data)
    .getSubreddit(config.target.subreddit)
    .updateStylesheet({ reason: 'testing script 1', css });
});


const fullDeploy = configFile =>
  loadSettings(configFile)
    // .then(deployImages)
    .then(deployStylesheet)
    // .then(deployFlairs)
    // .then(deploySidebar)

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
