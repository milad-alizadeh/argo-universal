import type { Argo } from '@argo/plugin-kit';
import { brightnessRange } from './hue';
import {
  change,
  homeData,
  householdRead,
  lightsRead,
  type HueCalls,
} from './hue-client';
import { hueSaturationToRgb, rgbToXy, withinGamut } from './hue-colour';
import type {
  Household,
  LightColour,
  Scene,
  Switch,
  Switchable,
} from './hue-model';

const hueRange = { min: 0, max: 359 };

const saturationRange = { min: 0, max: 100 };

const scenePageRange = { min: 1, max: 100 };

const sceneOffsetRange = { min: 0, max: Number.MAX_SAFE_INTEGER };

function inRange(
  value: number,
  name: string,
  { min, max }: { min: number; max: number },
): void {
  if (!Number.isFinite(value) || value < min || value > max)
    throw new Error(`${name} must be between ${min} and ${max}.`);
}

async function reachableLight(argo: HueCalls, id: string): Promise<Switch> {
  const light = (await lightsRead(argo)).find((each) => each.id === id);

  if (!light) throw new Error(`Hue has no light with id "${id}".`);

  if (!light.reachable) throw new Error(`${light.name} is unreachable.`);

  return light;
}

type LightSummary = Pick<
  Switch,
  'id' | 'name' | 'on' | 'brightness' | 'reachable'
> & {
  colour: Pick<LightColour, 'hue' | 'saturation'> | null;
};

function lightSummary({
  id,
  name,
  on,
  brightness,
  colour,
  reachable,
}: Switch): LightSummary {
  return {
    id,
    name,
    on,
    brightness,
    colour: colour && { hue: colour.hue, saturation: colour.saturation },
    reachable,
  };
}

type HouseholdListing = {
  rooms: {
    id: string;
    name: string;
    allLights: Pick<Switch, 'id' | 'on' | 'brightness'> | null;
    lights: LightSummary[];
  }[];
  others: LightSummary[];
};

function listHousehold({ rooms, others }: Household): HouseholdListing {
  return {
    rooms: rooms.map(({ id, name, group, lights }) => ({
      id,
      name,
      allLights: group && {
        id: group.id,
        on: group.on,
        brightness: group.brightness,
      },
      lights: lights.map(lightSummary),
    })),
    others: others.map(lightSummary),
  };
}

type SceneListing = {
  roomId: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type ScenePage = {
  total: number;
  scenes: (Omit<Scene, 'colours'> & { colours: string[] })[];
};

function listScenes(
  { rooms }: Household,
  { roomId, search = '', limit = 25, offset = 0 }: SceneListing,
): ScenePage {
  inRange(limit, 'Limit', scenePageRange);
  inRange(offset, 'Offset', sceneOffsetRange);

  if (!Number.isInteger(limit) || !Number.isInteger(offset))
    throw new Error('Limit and offset must be whole numbers.');

  const room = rooms.find(({ id }) => id === roomId);

  if (!room) throw new Error(`Hue has no room with id "${roomId}".`);

  const query = search.trim().toLowerCase();

  const matches = room.scenes.filter(({ name }) =>
    name.toLowerCase().includes(query),
  );

  return {
    total: matches.length,
    scenes: matches.slice(offset, offset + limit).map((scene) => ({
      ...scene,
      colours: [...scene.colours],
    })),
  };
}

async function setPower(
  argo: HueCalls,
  { kind, id, on }: { kind: Switchable; id: string; on: boolean },
): Promise<void> {
  if (kind === 'light') await reachableLight(argo, id);

  await change(argo, { kind, id, body: { on: { on } } });
}

async function setBrightness(
  argo: HueCalls,
  {
    kind,
    id,
    brightness,
  }: { kind: Switchable; id: string; brightness: number },
): Promise<void> {
  inRange(brightness, 'Brightness', brightnessRange);

  if (kind === 'light') await reachableLight(argo, id);

  await change(argo, { kind, id, body: { dimming: { brightness } } });
}

async function setColour(
  argo: HueCalls,
  { id, hue, saturation }: { id: string; hue: number; saturation: number },
): Promise<void> {
  inRange(hue, 'Hue', hueRange);
  inRange(saturation, 'Saturation', saturationRange);

  const light = await reachableLight(argo, id);

  if (!light.colour) throw new Error(`${light.name} cannot show colour.`);

  const xy = withinGamut(
    rgbToXy(hueSaturationToRgb(hue, saturation)),
    light.colour.gamut,
  );

  await change(argo, { kind: 'light', id, body: { color: { xy } } });
}

async function recallScene(argo: HueCalls, id: string): Promise<void> {
  const { rooms } = householdRead(await homeData(argo));

  if (!rooms.some(({ scenes }) => scenes.some((scene) => scene.id === id)))
    throw new Error(`Scene "${id}" no longer exists in a Hue room.`);

  await change(argo, {
    kind: 'scene',
    id,
    body: { recall: { action: 'active' } },
  });
}

export function registerHueOperations(argo: Argo): void {
  const household = async (): Promise<Household> =>
    householdRead(await homeData(argo));

  argo.operations.register('listHousehold', async () =>
    listHousehold(await household()),
  );
  argo.operations.register('listScenes', async (params) =>
    listScenes(await household(), params),
  );
  argo.operations.register('setPower', (params) => setPower(argo, params));
  argo.operations.register('setBrightness', (params) =>
    setBrightness(argo, params),
  );
  argo.operations.register('setColour', (params) => setColour(argo, params));
  argo.operations.register('recallScene', ({ id }) => recallScene(argo, id));
}
