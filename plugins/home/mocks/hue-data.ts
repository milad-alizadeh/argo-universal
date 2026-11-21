// A household as Hue's CLIP API v2 describes it: two lights in the Office, and one in no room.
export type FixtureLight = {
  id: string;
  device: string;
  name: string;
  on: boolean;
  brightness: number;
  // The light's colour as CIE xy, or null for a white-only light, which reports no colour.
  xy: [number, number] | null;
  reachable: boolean;
};

// A scene of a room, drawn from the colours it carries as CIE xy points.
export type FixtureScene = {
  id: string;
  name: string;
  room: string;
  colours: [number, number][];
  active: boolean;
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
  scenes: FixtureScene[];
  deferRecall: boolean;
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
  xy: stem === 'ceiling' ? null : [0.4573, 0.41],
  reachable: true,
});

const sceneOf = (
  stem: string,
  name: string,
  colours: [number, number][],
): FixtureScene => ({
  id: `scene-${stem}`,
  name,
  room: 'room-office',
  colours,
  active: false,
});

const office: FixtureRoom = {
  id: 'room-office',
  name: 'Office',
  devices: ['device-desk', 'device-ceiling'],
  group: 'group-office',
};

export const household = (): HueHousehold => ({
  lights: lightRows.map(lightOf),
  deferRecall: false,
  rooms: [{ ...office, devices: [...office.devices] }],
  groups: [{ id: 'group-office', on: true, brightness: 60 }],
  scenes: [
    sceneOf('relax', 'Relax', [
      [0.5, 0.41],
      [0.6, 0.35],
    ]),
    { ...sceneOf('focus', 'Focus', [[0.3, 0.33]]), active: true },
  ],
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

type Point = { x: number; y: number };

// Hue's gamut C, which the colour lights of the fixture report.
const gamut = {
  red: { x: 0.6915, y: 0.3083 },
  green: { x: 0.17, y: 0.7 },
  blue: { x: 0.1532, y: 0.0475 },
};

type LightJson = Switched & {
  id: string;
  type: 'light';
  owner: Link;
  metadata: { name: string };
  color?: { xy: Point; gamut: typeof gamut; gamut_type: 'C' };
};

type ConnectivityJson = {
  id: string;
  type: 'zigbee_connectivity';
  owner: Link;
  status: string;
};

type SceneJson = {
  id: string;
  type: 'scene';
  metadata: { name: string };
  group: Link;
  status: { active: 'inactive' | 'static' };
  palette: {
    color: { color: { xy: Point }; dimming: { brightness: number } }[];
  };
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
  ...(light.xy && {
    color: {
      xy: { x: light.xy[0], y: light.xy[1] },
      gamut,
      gamut_type: 'C' as const,
    },
  }),
});

export const connectivityJson = (light: FixtureLight): ConnectivityJson => ({
  id: `zigbee-${light.device}`,
  type: 'zigbee_connectivity',
  owner: { rid: light.device, rtype: 'device' },
  status: light.reachable ? 'connected' : 'connectivity_issue',
});

export const sceneJson = (scene: FixtureScene): SceneJson => ({
  id: scene.id,
  type: 'scene',
  metadata: { name: scene.name },
  group: { rid: scene.room, rtype: 'room' },
  status: { active: scene.active ? 'static' : 'inactive' },
  palette: {
    color: scene.colours.map(([x, y]) => ({
      color: { xy: { x, y } },
      dimming: { brightness: 100 },
    })),
  },
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
