import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { applicationKey } from './mocks/hue-data';
import {
  connected,
  homeAgent,
  startHome,
  type HomeJourney,
} from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const office = 'room-office';

const desk = 'light-desk';

const relax = 'scene-relax';

const focus = 'scene-focus';

const run = (
  { test }: HomeJourney,
  name: string,
  params: Record<string, string | number | boolean> = {},
): ReturnType<HomeJourney['test']['operations']['run']> =>
  test.operations.run({ name, params, caller: homeAgent });

const connectedHome = async (): Promise<HomeJourney> => {
  const home = await startHome();

  await connected(home);

  return home;
};

const path = (resource: string): string =>
  `/route/clip/v2/resource/${resource}`;

it(
  'lists the household with each room’s level, each light’s power, brightness, colour and reachability, and the lights in no room',
  async () => {
    const home = await connectedHome();
    const [, ceiling] = home.hue.home.lights;

    if (ceiling) ceiling.reachable = false;

    await home.test.pages.draw({ path: '/', serverDevice: true, pull: true });

    expect(await run(home, 'listHousehold')).toEqual({
      rooms: [
        {
          id: office,
          name: 'Office',
          allLights: { id: 'group-office', on: true, brightness: 60 },
          lights: [
            {
              id: desk,
              name: 'Desk lamp',
              on: true,
              brightness: 80,
              colour: { hue: 39, saturation: 53 },
              reachable: true,
            },
            {
              id: 'light-ceiling',
              name: 'Ceiling',
              on: false,
              brightness: 40,
              colour: null,
              reachable: false,
            },
          ],
        },
      ],
      others: [
        {
          id: 'light-porch',
          name: 'Porch',
          on: true,
          brightness: 100,
          colour: { hue: 39, saturation: 53 },
          reachable: true,
        },
      ],
    });
  },
  timeoutMs,
);

it(
  'lists a room’s scenes with their gradient colours and the active one, narrowed by search and paged',
  async () => {
    const home = await connectedHome();

    const all = await run(home, 'listScenes', { roomId: office });

    expect(all).toMatchObject({
      total: 2,
      scenes: [
        { id: relax, name: 'Relax', active: false },
        { id: focus, name: 'Focus', active: true },
      ],
    });
    expect(JSON.stringify(all)).toMatch(
      /"id":"scene-relax","name":"Relax","colours":\["#[0-9a-f]{6}","#[0-9a-f]{6}"\]/,
    );
    expect(
      await run(home, 'listScenes', { roomId: office, search: 'REL' }),
    ).toMatchObject({ total: 1, scenes: [{ name: 'Relax' }] });
    expect(
      await run(home, 'listScenes', {
        roomId: office,
        limit: 1,
        offset: 1,
      }),
    ).toMatchObject({ total: 2, scenes: [{ name: 'Focus' }] });
  },
  timeoutMs,
);

it(
  'answers an empty scene list for a room with none, and refuses a room Hue does not have',
  async () => {
    const home = await startHome();

    home.hue.home.rooms.push({
      id: 'room-hall',
      name: 'Hallway',
      devices: [],
      group: 'group-hall',
    });
    home.hue.home.groups.push({ id: 'group-hall', on: false, brightness: 0 });
    await connected(home);

    expect(await run(home, 'listScenes', { roomId: 'room-hall' })).toEqual({
      total: 0,
      scenes: [],
    });
    await expect(
      run(home, 'listScenes', { roomId: 'room-nowhere' }),
    ).rejects.toThrow(/no room/i);
  },
  timeoutMs,
);

it(
  'sets a light’s colour from hue and saturation, in Hue’s colour space, with the application key',
  async () => {
    const home = await connectedHome();

    await run(home, 'setColour', { id: desk, hue: 0, saturation: 50 });

    const [put] = home.hue.puts();

    expect(put).toMatchObject({
      path: path('light/light-desk'),
      key: applicationKey,
    });
    expect(put?.body).toMatchObject({
      color: {
        xy: { x: expect.closeTo(0.5245, 3), y: expect.closeTo(0.3132, 3) },
      },
    });
    expect(await run(home, 'listHousehold')).toMatchObject({
      rooms: [
        {
          lights: expect.arrayContaining([
            expect.objectContaining({
              id: desk,
              colour: { hue: 0, saturation: 50 },
            }),
          ]),
        },
      ],
    });
  },
  timeoutMs,
);

it(
  'keeps a colour within the light’s own gamut',
  async () => {
    const home = await connectedHome();

    await run(home, 'setColour', {
      id: desk,
      hue: 120,
      saturation: 100,
    });

    expect(home.hue.puts()[0]?.body).toMatchObject({
      color: { xy: { x: expect.closeTo(0.17, 3), y: expect.closeTo(0.7, 3) } },
    });
  },
  timeoutMs,
);

it(
  'refuses a colour for an unreachable light, a white-only light and a value out of range, sending nothing',
  async () => {
    const home = await connectedHome();
    const [deskLamp] = home.hue.home.lights;

    await expect(
      run(home, 'setColour', { id: 'light-ceiling', hue: 10, saturation: 10 }),
    ).rejects.toThrow(/cannot show colour/i);
    await expect(
      run(home, 'setColour', { id: desk, hue: 360, saturation: 10 }),
    ).rejects.toThrow(/hue/i);
    await expect(
      run(home, 'setColour', { id: desk, hue: 10, saturation: 101 }),
    ).rejects.toThrow(/saturation/i);
    await expect(
      run(home, 'setColour', { id: 'light-gone', hue: 10, saturation: 10 }),
    ).rejects.toThrow(/no light/i);

    if (deskLamp) deskLamp.reachable = false;

    await expect(
      run(home, 'setColour', { id: desk, hue: 10, saturation: 10 }),
    ).rejects.toThrow(/unreachable/i);
    expect(home.hue.puts()).toEqual([]);
  },
  timeoutMs,
);

it(
  'refuses to switch or dim an unreachable light, but still switches a room',
  async () => {
    const home = await connectedHome();
    const [deskLamp] = home.hue.home.lights;

    if (deskLamp) deskLamp.reachable = false;

    await expect(
      run(home, 'setPower', { kind: 'light', id: desk, on: false }),
    ).rejects.toThrow(/Desk lamp is unreachable/);
    await expect(
      run(home, 'setBrightness', {
        kind: 'light',
        id: desk,
        brightness: 10,
      }),
    ).rejects.toThrow(/unreachable/);
    expect(home.hue.puts()).toEqual([]);
    await run(home, 'setPower', {
      kind: 'grouped_light',
      id: 'group-office',
      on: false,
    });
    expect(home.hue.puts()).toHaveLength(1);
  },
  timeoutMs,
);

it(
  'recalls a scene, and the active scene moves only once Hue has it and the page reads again',
  async () => {
    const home = await connectedHome();

    const scenes = (): ReturnType<typeof run> =>
      run(home, 'listScenes', { roomId: office });

    const focusActive = {
      scenes: [
        { id: relax, active: false },
        { id: focus, active: true },
      ],
    };

    expect(await scenes()).toMatchObject(focusActive);
    home.hue.home.deferRecall = true;
    await run(home, 'recallScene', { id: relax });

    expect(home.hue.puts()).toEqual([
      {
        path: path('scene/scene-relax'),
        body: { recall: { action: 'active' } },
        key: applicationKey,
      },
    ]);
    expect(await scenes()).toMatchObject(focusActive);

    for (const scene of home.hue.home.scenes) scene.active = scene.id === relax;

    expect(await scenes()).toMatchObject({
      scenes: [
        { id: relax, active: true },
        { id: focus, active: false },
      ],
    });
  },
  timeoutMs,
);

it(
  'marks the Home page after Hue confirms a scene recalled by an Agent',
  async () => {
    const home = await connectedHome();
    const controller = new AbortController();
    const stale = home.test.pages.stale(controller.signal);

    try {
      await run(home, 'recallScene', { id: relax });
      await home.test.clock.advance(250);

      // The sign-in page, which holds no Query, is marked at once; Home once its Household is read again (ADR-0060).
      const marked = [];

      for await (const mark of stale) {
        marked.push(mark);

        if (mark.addresses?.some(({ path }) => path === '/')) break;
      }

      expect(marked.at(-1)).toMatchObject({
        pluginId: 'home',
        addresses: expect.arrayContaining([
          expect.objectContaining({ path: '/' }),
        ]),
      });
    } finally {
      controller.abort();
    }
  },
  timeoutMs,
);

it(
  'refuses to recall a scene that has vanished, sending nothing',
  async () => {
    const home = await connectedHome();

    await expect(
      run(home, 'recallScene', { id: 'scene-gone' }),
    ).rejects.toThrow(/no longer exists/i);
    expect(home.hue.puts()).toEqual([]);
  },
  timeoutMs,
);

it(
  'declares the four Operations for an Agent to find',
  async () => {
    const home = await connectedHome();
    const rows = await home.test.operations.list();

    expect(rows.map((row) => row.id)).toEqual(
      expect.arrayContaining([
        'home.listHousehold',
        'home.listScenes',
        'home.setColour',
        'home.recallScene',
      ]),
    );
  },
  timeoutMs,
);
