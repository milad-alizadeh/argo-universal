import {
  defaultGamut,
  mirekToRgb,
  rgbToHueSaturation,
  toHex,
  xyToRgb,
  type Gamut,
  type Point,
} from './hue-colour';
import type {
  Household,
  LightColour,
  Room,
  Scene,
  Switch,
  Switchable,
} from './hue-model';
import { at, list, present, text, type Json } from './json';

/*
 * Narrows CLIP v2's resource lists into the household. A light names the device it belongs to in `owner`; a room
 * lists its devices in `children` and its grouped light in `services`. UNCONFIRMED against Hue's login-walled
 * reference; these are the shapes the openhue OpenAPI description and Hue's community clients use.
 */
export type HueLists = Readonly<{
  lights: readonly Json[];
  rooms: readonly Json[];
  groups: readonly Json[];
  scenes: readonly Json[];
  connectivity: readonly Json[];
}>;

const percent = (value: Json | undefined): number =>
  typeof value === 'number' ? value : 0;

const number = (value: Json | undefined): number | null =>
  typeof value === 'number' ? value : null;

function pointOf(json: Json | undefined): Point | null {
  const x = number(at(json, 'x'));
  const y = number(at(json, 'y'));

  return x === null || y === null ? null : { x, y };
}

function gamutOf(json: Json | undefined): Gamut {
  const red = pointOf(at(json, 'red'));
  const green = pointOf(at(json, 'green'));
  const blue = pointOf(at(json, 'blue'));

  return red && green && blue ? { red, green, blue } : defaultGamut;
}

// A light that reports a colour point can show colour; a white-only light reports none.
function colourOf(json: Json): LightColour | null {
  const point = pointOf(at(json, 'color', 'xy'));

  return point
    ? {
        ...rgbToHueSaturation(xyToRgb(point)),
        gamut: gamutOf(at(json, 'color', 'gamut')),
      }
    : null;
}

type Fields = { colour: LightColour | null; reachable: boolean };

const plain: Fields = { colour: null, reachable: true };

function switchOf(
  kind: Switchable,
  json: Json,
  fields: Fields = plain,
): Switch | null {
  const id = text(at(json, 'id'));

  return id
    ? {
        kind,
        id,
        name: text(at(json, 'metadata', 'name')) ?? '',
        on: at(json, 'on', 'on') === true,
        brightness: percent(at(json, 'dimming', 'brightness')),
        ...fields,
      }
    : null;
}

// The ids a resource links to of one type, such as a room's devices.
const linked = (json: Json, key: string, rtype: string): string[] =>
  list(at(json, key))
    .flatMap((link) =>
      at(link, 'rtype') === rtype ? [text(at(link, 'rid'))] : [],
    )
    .filter(present);

// Each light beside the device that owns it; one device may own several lights, and a light may have no owner.
type Owned = Readonly<{ device: string | null; light: Switch }>;

type Index = { lights: Owned[]; groups: Map<string, Switch> };

// Devices the Bridge cannot reach, by their zigbee connectivity.
const unreachableDevices = (connectivity: readonly Json[]): Set<string> =>
  new Set(
    connectivity.flatMap((json) => {
      const device = text(at(json, 'owner', 'rid'));
      const status = text(at(json, 'status'));

      return device && status !== 'connected' ? [device] : [];
    }),
  );

const ownedOf =
  (unreachableDeviceIds: Set<string>) =>
  (json: Json): Owned[] => {
    const device = text(at(json, 'owner', 'rid'));

    const light = switchOf('light', json, {
      colour: colourOf(json),
      reachable: device === null || !unreachableDeviceIds.has(device),
    });

    return light ? [{ device, light }] : [];
  };

const groupEntry = (json: Json): [string, Switch][] => {
  const group = switchOf('grouped_light', json);

  return group ? [[group.id, group]] : [];
};

const indexOf = (lists: HueLists): Index => ({
  lights: lists.lights.flatMap(ownedOf(unreachableDevices(lists.connectivity))),
  groups: new Map(lists.groups.flatMap(groupEntry)),
});

// The lights of a room's devices, in Hue's order of lights.
const lightsOf = (devices: string[], { lights }: Index): Switch[] =>
  lights.flatMap(({ device, light }) =>
    device !== null && devices.includes(device) ? [light] : [],
  );

const groupOf = (json: Json, { groups }: Index): Switch | null =>
  groups.get(linked(json, 'services', 'grouped_light')[0] ?? '') ?? null;

function swatchOf(json: Json | undefined): string[] {
  const xy = pointOf(at(json, 'color', 'xy'));

  if (xy) return [toHex(xyToRgb(xy))];

  const mirek = number(at(json, 'color_temperature', 'mirek'));

  return mirek !== null && mirek > 0 ? [toHex(mirekToRgb(mirek))] : [];
}

// Use the scene's palette if present, or the colours of its individual light actions.
function coloursOf(json: Json): string[] {
  const palette = [
    ...list(at(json, 'palette', 'color')),
    ...list(at(json, 'palette', 'color_temperature')),
  ].flatMap(swatchOf);

  return palette.length > 0
    ? palette
    : list(at(json, 'actions')).flatMap((each) => swatchOf(at(each, 'action')));
}

const activeScenes = new Set(['static', 'dynamic_palette']);

function sceneOf(json: Json): { room: string; scene: Scene }[] {
  const id = text(at(json, 'id'));

  const room =
    at(json, 'group', 'rtype') === 'room'
      ? text(at(json, 'group', 'rid'))
      : null;

  return id && room
    ? [
        {
          room,
          scene: {
            id,
            name: text(at(json, 'metadata', 'name')) ?? '',
            colours: coloursOf(json),
            active: activeScenes.has(text(at(json, 'status', 'active')) ?? ''),
          },
        },
      ]
    : [];
}

function scenesByRoom(lists: HueLists): Map<string, Scene[]> {
  const grouped = new Map<string, Scene[]>();

  for (const { room, scene } of lists.scenes.flatMap(sceneOf)) {
    const scenes = grouped.get(room);

    if (scenes) scenes.push(scene);
    else grouped.set(room, [scene]);
  }

  return grouped;
}

function roomOf(
  json: Json,
  index: Index,
  scenes: Map<string, Scene[]>,
): Room | null {
  const id = text(at(json, 'id'));

  if (!id) return null;

  return {
    id,
    name: text(at(json, 'metadata', 'name')) ?? '',
    group: groupOf(json, index),
    lights: lightsOf(linked(json, 'children', 'device'), index),
    scenes: scenes.get(id) ?? [],
  };
}

// The rooms in Hue's order, each with its lights, then every light no room holds.
export function householdOf(lists: HueLists): Household {
  const index = indexOf(lists);

  const scenes = scenesByRoom(lists);

  const rooms = lists.rooms
    .map((json) => roomOf(json, index, scenes))
    .filter(present);

  const inRooms = new Set(
    rooms.flatMap((room) => room.lights.map((light) => light.id)),
  );

  return {
    rooms,
    others: index.lights.flatMap(({ light }) =>
      inRooms.has(light.id) ? [] : [light],
    ),
  };
}
