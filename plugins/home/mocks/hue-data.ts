// A household as Hue's CLIP API v2 describes it: two lights in the Office, and one in no room.
export type FixtureLight = {
  id: string;
  device: string;
  name: string;
  on: boolean;
  brightness: number;
};

export type FixtureGroup = { id: string; on: boolean; brightness: number };

export type FixtureRoom = {
  id: string;
  name: string;
  devices: string[];
  group: string;
};

export type HueHousehold = {
  lights: FixtureLight[];
  rooms: FixtureRoom[];
  groups: FixtureGroup[];
};

// Each light as its id's stem, its name, whether it is on and its brightness.
const lightRows: [string, string, boolean, number][] = [
  ['desk', 'Desk lamp', true, 80],
  ['ceiling', 'Ceiling', false, 40],
  ['porch', 'Porch', true, 100],
];

const lightOf = ([
  stem,
  name,
  on,
  brightness,
]: (typeof lightRows)[number]): FixtureLight => ({
  id: `light-${stem}`,
  device: `device-${stem}`,
  name,
  on,
  brightness,
});

const office: FixtureRoom = {
  id: 'room-office',
  name: 'Office',
  devices: ['device-desk', 'device-ceiling'],
  group: 'group-office',
};

export const household = (): HueHousehold => ({
  lights: lightRows.map(lightOf),
  rooms: [{ ...office, devices: [...office.devices] }],
  groups: [{ id: 'group-office', on: true, brightness: 60 }],
});

// The person's Remote API app, as they would enter it in the Plugin's settings.
export const hueApp = {
  id: 'fixture-hue-client-7c2a',
  secret: 'fixture-hue-secret-41d9',
};

export const appSettings = new Map([
  ['hue-client-id', hueApp.id],
  ['hue-client-secret', hueApp.secret],
]);

export const grantedCode = 'fixture-hue-code';

export const accessToken = 'hue-access-1';

export const applicationKey = 'fixture-application-key';

export const bridgeId = 'ECB5FAFFFE0A1B2C';

type Link = { rid: string; rtype: string };

type Switched = { on: { on: boolean }; dimming: { brightness: number } };

type LightJson = Switched & {
  id: string;
  type: 'light';
  owner: Link;
  metadata: { name: string };
};

type RoomJson = {
  id: string;
  type: 'room';
  metadata: { name: string };
  children: Link[];
  services: Link[];
};

type GroupJson = Switched & { id: string; type: 'grouped_light' };

// Each resource as Hue's CLIP v2 lists it.
export const lightJson = (light: FixtureLight): LightJson => ({
  id: light.id,
  type: 'light',
  owner: { rid: light.device, rtype: 'device' },
  metadata: { name: light.name },
  on: { on: light.on },
  dimming: { brightness: light.brightness },
});

export const roomJson = (room: FixtureRoom): RoomJson => ({
  id: room.id,
  type: 'room',
  metadata: { name: room.name },
  children: room.devices.map((rid) => ({ rid, rtype: 'device' })),
  services: [{ rid: room.group, rtype: 'grouped_light' }],
});

export const groupJson = (group: FixtureGroup): GroupJson => ({
  id: group.id,
  type: 'grouped_light',
  on: { on: group.on },
  dimming: { brightness: group.brightness },
});
