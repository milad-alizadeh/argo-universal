import type { Household, Room, Switch, Switchable } from './hue-model';
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
}>;

const percent = (value: Json | undefined): number =>
  typeof value === 'number' ? value : 0;

const switchFields = (kind: Switchable, json: Json, id: string): Switch => ({
  kind,
  id,
  name: text(at(json, 'metadata', 'name')) ?? '',
  on: at(json, 'on', 'on') === true,
  brightness: percent(at(json, 'dimming', 'brightness')),
});

function switchOf(kind: Switchable, json: Json): Switch | null {
  const id = text(at(json, 'id'));

  return id ? switchFields(kind, json, id) : null;
}

// The ids a resource links to of one type, such as a room's devices.
const linked = (json: Json, key: string, rtype: string): string[] =>
  list(at(json, key))
    .flatMap((link) =>
      at(link, 'rtype') === rtype ? [text(at(link, 'rid'))] : [],
    )
    .filter(present);

type Index = { byDevice: Map<string, Switch>; groups: Map<string, Switch> };

const deviceOf = (json: Json): string => text(at(json, 'owner', 'rid')) ?? '';

// Each light keyed by its device, as a room lists them.
const lightEntry = (json: Json): [string, Switch][] => {
  const light = switchOf('light', json);

  return light ? [[deviceOf(json), light]] : [];
};

const groupEntry = (json: Json): [string, Switch][] => {
  const group = switchOf('grouped_light', json);

  return group ? [[group.id, group]] : [];
};

const indexOf = (lists: HueLists): Index => ({
  byDevice: new Map(lists.lights.flatMap(lightEntry)),
  groups: new Map(lists.groups.flatMap(groupEntry)),
});

const groupOf = (json: Json, { groups }: Index): Switch | null =>
  groups.get(linked(json, 'services', 'grouped_light')[0] ?? '') ?? null;

function roomOf(json: Json, index: Index): Room | null {
  const id = text(at(json, 'id'));

  if (!id) return null;

  return {
    id,
    name: text(at(json, 'metadata', 'name')) ?? '',
    group: groupOf(json, index),
    lights: linked(json, 'children', 'device')
      .map((device) => index.byDevice.get(device) ?? null)
      .filter(present),
  };
}

// The rooms in Hue's order, each with its lights, then every light no room holds.
export function householdOf(lists: HueLists): Household {
  const index = indexOf(lists);
  const rooms = lists.rooms.map((json) => roomOf(json, index)).filter(present);

  const inRooms = new Set(
    rooms.flatMap((room) => room.lights.map((light) => light.id)),
  );

  return {
    rooms,
    others: [...index.byDevice.values()].filter(
      (light) => !inRooms.has(light.id),
    ),
  };
}
