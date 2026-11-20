import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import {
  accessToken,
  applicationKey,
  bridgeId,
  grantedCode,
  hueApp,
} from './hue-data';

/*
 * Hue's cloud as the Plugin meets it before any light is read: the v2 token endpoint, which takes the app's client
 * secret, and the Bridge's v1 API through the cloud, where the virtual link button gives an application key. These
 * follow the widely cited Remote API shapes, which Hue's own login-walled reference was not read to confirm.
 */
export type HueCloud = {
  // The token endpoint's request bodies.
  forms: URLSearchParams[];
  linkPressed: boolean;
};

const json = <Body>(body: Body, status = 200): FixtureAnswer => ({
  status,
  json: body,
});

const bearer = (request: FixtureRequest): boolean =>
  request.headers.authorization === `Bearer ${accessToken}`;

function token(cloud: HueCloud, request: FixtureRequest): FixtureAnswer {
  const form = new URLSearchParams(request.body);

  cloud.forms.push(form);

  if (form.get('code') !== grantedCode) return json({ error: 'invalid_grant' }, 400);

  if (form.get('client_secret') !== hueApp.secret)
    return json({ error: 'invalid_client' }, 401);

  return json({
    access_token: accessToken,
    refresh_token: 'hue-refresh-1',
    expires_in: 604_800,
    token_type: 'bearer',
  });
}

// v1 answers a list of results, each a `success` or an `error`.
const linkError = json([
  { error: { type: 101, address: '', description: 'link button not pressed' } },
]);

function applicationKeyAnswer(cloud: HueCloud): FixtureAnswer {
  if (!cloud.linkPressed) return linkError;

  return json([{ success: { username: applicationKey } }]);
}

function config(cloud: HueCloud, request: FixtureRequest): FixtureAnswer {
  if (request.method !== 'PUT')
    return json({ name: 'Hue Bridge', bridgeid: bridgeId });

  cloud.linkPressed = JSON.parse(request.body).linkbutton === true;

  return json([{ success: { '/config/linkbutton': cloud.linkPressed } }]);
}

type Route = (cloud: HueCloud, request: FixtureRequest) => FixtureAnswer;

const unauthorised = json({ fault: 'Invalid access token' }, 401);

// The Bridge's API through the cloud answers only the Account's Bearer token.
const signedIn =
  (route: Route): Route =>
  (cloud, request) =>
    bearer(request) ? route(cloud, request) : unauthorised;

const routes = new Map<string, Route>([
  ['POST /v2/oauth2/token', token],
  ['GET /route/api/0/config', signedIn(config)],
  ['PUT /route/api/0/config', signedIn(config)],
  ['POST /route/api', signedIn(applicationKeyAnswer)],
]);

// Answers a request it serves, or null for one the CLIP v2 fixture serves.
export function cloudAnswer(
  cloud: HueCloud,
  request: FixtureRequest,
): FixtureAnswer | null {
  const route = routes.get(`${request.method} ${request.path}`);

  return route ? route(cloud, request) : null;
}
