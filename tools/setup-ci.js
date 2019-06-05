// eslint-disable-next-line import/no-extraneous-dependencies
const setNpmAuthTokenForCI = require('set-npm-auth-token-for-ci');

if (process.env.CI) {
  // write NPM_TOKEN to .npmrc for authentication
  setNpmAuthTokenForCI();
}
