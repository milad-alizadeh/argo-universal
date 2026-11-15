/*
 * Argo's OAuth callback port is fixed, so a Plugin's test files that sign in through the browser take turns on it:
 * call `serialiseOnOAuthPort()` once at the top of each such file.
 */
export { serialiseOnOAuthPort } from '../../engine/mocks/oauth-port-lock';
