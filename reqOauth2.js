const express = require('express');
const fse = require('fs-extra');
const uuidv4 = require('uuid/v4');
const opn = require('opn');
const timers = require('timers');
const url = require('url');
const Client = require('node-rest-client').Client;

const generateOptions = (options) => {
  const defaultOpts = {
    clientId: '',
    clientSecret: '',
    redirectUri: 'http://localhost:55555/authorize',
    oauth2Uri: 'https://www.reddit.com/api/v1/authorize',
    refreshUri: 'https://www.reddit.com/api/v1/access_token',
    duration: 'permanent',
    scope: 'modconfig modflair structuredstyles wikiedit wikiread',
    timeout: 5*60,
  };

  const constants = {
    grantType: 'authorization_code',
    response_type: 'code',
    state: uuidv4(),
  };

  return Object.assign({}, defaultOpts, options, constants);
}

const request = (options) => new Promise((resolve, reject) => {
  const opts = generateOptions(options);

  const redirectUrl = url.parse(opts.redirectUri);
  const oauth2Uri = url.parse(opts.oauth2Uri);
  oauth2Uri.query = {
    client_id: opts.clientId,
    response_type: opts.response_type,
    redirect_uri: opts.redirectUri,
    duration: opts.duration,
    state: opts.state,
    scope: opts.scope,
  };
  const oauth2Url = url.format(oauth2Uri);

  const app = express();
  app.get(redirectUrl.path, (req, res) => authorize(req, res));

  const server = app.listen(redirectUrl.port);

  const closer = (data) => {
    console.log('closing server...');
    server.close(() => console.log('server closed'));
    if (req) {
      timers.clearTimeout(req);
    }
    return resolve(data);
  };

  var authorize = makeAuthorize(opts, closer);

  console.log(`opening oauth2 endpoint ${oauth2Url}`);
  opn(oauth2Url);
  console.log(`listening on ${redirectUrl.port}`);

  const req = timers.setTimeout(() =>
    server.close(() =>
      reject(`No oauth2 response was received within ${opts.timeout} seconds. Aborting...`)
    ),
    opts.timeout * 1000
  );
})

const makeAuthorize = (options, closer) => (req, res) => {
  const { state, code } = req.query;

  const basicAuth = { user: options.clientId, password: options.clientSecret };
  const client = new Client(basicAuth);

  var args = {
    data: `grant_type=${options.grantType}&code=${code}&redirect_uri=${options.redirectUri}`
  };

  client.post(options.refreshUri, args, (data, res2) => {
    res.set('Connection', 'close');
    res.send(data);

    closer(data);
  });
}

module.exports = {
  request
}
