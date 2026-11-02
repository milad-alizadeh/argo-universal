/*
 * The client ID of Argo's GitHub OAuth app, the one with device flow switched on. It is public by design: a device-flow
 * app has no secret, and the ID only names the app on GitHub's authorisation page. Empty until the app is registered,
 * and while it is, sign-in says so instead of asking GitHub.
 */
export const githubClientId = '';
