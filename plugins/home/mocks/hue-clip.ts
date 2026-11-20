import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import {
  accessToken,
  applicationKey,
  groupJson,
  lightJson,
  roomJson,
  type FixtureGroup,
  type FixtureLight,
  type HueHousehold,
} from './hue-data';

/*
 * The CLIP API v2 through Hue's cloud, as the Plugin meets it: lists of lights, rooms and grouped lights, and a PUT
 * that switches one or sets its brightness. Every call needs the Account's Bearer token and the Bridge's application
 * key. The paths and bodies are the widely cited ones, UNCONFIRMED against Hue's login-walled reference.
 */
const clipPath = /^\/route\/clip\/v2\/resource\/(light|room|grouped_light)(?:\/([^/]+))?$/;

const answer = <Data>(data: Data, status = 200): FixtureAnswer => ({
  status,
  json: { errors: [], data },
});

const keyed = (request: FixtureRequest): boolean =>
  request.headers.authorization === `Bearer ${accessToken}` &&
  request.headers['hue-application-key'] === applicationKey;

const forbidden: FixtureAnswer = {
  status: 403,
  json: { errors: [{ description: 'unauthorized user' }], data: [] },
};

function listed(home: HueHousehold, kind: string): FixtureAnswer {
  if (kind === 'light') return answer(home.lights.map(lightJson));

  if (kind === 'room') return answer(home.rooms.map(roomJson));

  return answer(home.groups.map(groupJson));
}

type Change = { on?: { on?: boolean }; dimming?: { brightness?: number } };

const powerOf = (change: Change): { on?: boolean } =>
  change.on?.on === undefined ? {} : { on: change.on.on };

const brightnessOf = (change: Change): { brightness?: number } =>
  change.dimming?.brightness === undefined
    ? {}
    : { brightness: change.dimming.brightness };

// A PUT changes only what its body names, as CLIP v2 does.
function applied(target: FixtureLight | FixtureGroup, change: Change): void {
  Object.assign(target, powerOf(change), brightnessOf(change));
}

const targetOf = (
  home: HueHousehold,
  { kind, id }: { kind: string; id: string },
): FixtureLight | FixtureGroup | undefined =>
  (kind === 'light' ? home.lights : home.groups).find((each) => each.id === id);

function changed(
  home: HueHousehold,
  request: FixtureRequest,
  found: { kind: string; id: string },
): FixtureAnswer {
  const target = targetOf(home, found);

  if (!target) return { status: 404, json: { errors: [{ description: 'Not found' }], data: [] } };
  applied(target, JSON.parse(request.body));

  return answer([{ rid: found.id, rtype: found.kind }]);
}

function resourceAnswer(
  home: HueHousehold,
  request: FixtureRequest,
  { kind, id }: { kind: string; id: string | undefined },
): FixtureAnswer {
  return id ? changed(home, request, { kind, id }) : listed(home, kind);
}

function routed(
  home: HueHousehold,
  request: FixtureRequest,
  match: RegExpMatchArray,
): FixtureAnswer {
  if (!keyed(request)) return forbidden;

  return resourceAnswer(home, request, { kind: match[1] ?? '', id: match[2] });
}

// Answers a CLIP v2 request, or null for any other path.
export function clipAnswer(
  home: HueHousehold,
  request: FixtureRequest,
): FixtureAnswer | null {
  const match = request.path.match(clipPath);

  return match ? routed(home, request, match) : null;
}
