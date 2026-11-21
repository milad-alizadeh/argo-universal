import type { FixtureAnswer, FixtureRequest } from '@argo/plugin-kit/testing';
import {
  accessToken,
  applicationKey,
  connectivityJson,
  groupJson,
  lightJson,
  roomJson,
  sceneJson,
  type FixtureGroup,
  type FixtureLight,
  type FixtureScene,
  type HueHousehold,
} from './hue-data';

/*
 * The CLIP API v2 through Hue's cloud, as the Plugin meets it: lists of lights, rooms and grouped lights, and a PUT
 * that switches one or sets its brightness. Every call needs the Account's Bearer token and the Bridge's application
 * key. The paths and bodies are the widely cited ones, UNCONFIRMED against Hue's login-walled reference.
 */
const clipPath =
  /^\/route\/clip\/v2\/resource\/(light|room|grouped_light|scene|zigbee_connectivity)(?:\/([^/]+))?$/;

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

  if (kind === 'scene') return answer(home.scenes.map(sceneJson));

  if (kind === 'zigbee_connectivity')
    return answer(home.lights.map(connectivityJson));

  return answer(home.groups.map(groupJson));
}

type Change = {
  on?: { on?: boolean };
  dimming?: { brightness?: number };
  color?: { xy?: { x: number; y: number } };
  recall?: { action?: string };
};

const powerOf = (change: Change): { on?: boolean } =>
  change.on?.on === undefined ? {} : { on: change.on.on };

const brightnessOf = (change: Change): { brightness?: number } =>
  change.dimming?.brightness === undefined
    ? {}
    : { brightness: change.dimming.brightness };

const colourOf = (change: Change): { xy?: [number, number] } =>
  change.color?.xy ? { xy: [change.color.xy.x, change.color.xy.y] } : {};

// A PUT changes only what its body names, as CLIP v2 does.
function applied(target: FixtureLight | FixtureGroup, change: Change): void {
  Object.assign(
    target,
    powerOf(change),
    brightnessOf(change),
    colourOf(change),
  );
}

// Recalling a scene makes it the room's one active scene.
function recalled(home: HueHousehold, scene: FixtureScene): void {
  for (const each of home.scenes)
    if (each.room === scene.room) each.active = each.id === scene.id;
}

type Target = FixtureLight | FixtureGroup | FixtureScene;

function poolOf(home: HueHousehold, kind: string): Target[] {
  if (kind === 'light') return home.lights;

  return kind === 'scene' ? home.scenes : home.groups;
}

const targetOf = (
  home: HueHousehold,
  { kind, id }: { kind: string; id: string },
): Target | undefined => poolOf(home, kind).find((each) => each.id === id);

function changed(
  home: HueHousehold,
  request: FixtureRequest,
  found: { kind: string; id: string },
): FixtureAnswer {
  const target = targetOf(home, found);

  if (!target)
    return {
      status: 404,
      json: { errors: [{ description: 'Not found' }], data: [] },
    };
  const change: Change = JSON.parse(request.body);

  if ('room' in target) {
    if (change.recall?.action === 'active' && !home.deferRecall)
      recalled(home, target);
  } else applied(target, change);

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
