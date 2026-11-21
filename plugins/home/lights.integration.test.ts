import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { homeWords } from './home-words';
import { shown, sliderOf, toggleOf } from './mocks/controls';
import { applicationKey } from './mocks/hue-data';
import { connected, homePage, startHome } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const desk = 'light-desk';

const ceiling = 'light-ceiling';

const lightSection = 'Fader';

it(
  'shows each room with its own card and its lights’ cards, then the lights in no room, each with power and brightness',
  async () => {
    const page = await connected(await startHome());

    expect(page.find('Office').type).toBe('Text');
    expect(page.findText('2 lights · 60%')).toBeDefined();
    expect(page.find(sliderOf(desk)).type).toBe(lightSection);
    expect(page.find(homeWords.otherLights).type).toBe('Text');
    expect(shown(page, toggleOf(desk))).toBe('true');
    expect(shown(page, toggleOf(ceiling))).toBe('false');
    expect(shown(page, sliderOf('light-porch'))).toBe('100');
    expect(shown(page, toggleOf('group-office'))).toBe('true');
    expect(page.find(sliderOf(desk)).props).toMatchObject({
      minimumValue: 1,
      maximumValue: 100,
      valueLabel: '80%',
    });
  },
  timeoutMs,
);

it(
  'switches a light off with its Toggle, sending its application key, and shows it off',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    await page.act(toggleOf(desk), 'onPress');

    expect(home.hue.puts()).toEqual([
      {
        path: '/route/clip/v2/resource/light/light-desk',
        body: { on: { on: false } },
        key: applicationKey,
      },
    ]);
    expect(shown(page, toggleOf(desk))).toBe('false');
  },
  timeoutMs,
);

it(
  'dims a light with its Slider and every light in a room with the room’s card',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    await page.act(sliderOf(ceiling), 'onValueChange', 25);
    await home.test.clock.advance(150);
    await page.act(toggleOf('group-office'), 'onPress');

    expect(home.hue.puts().map(({ path, body }) => ({ path, body }))).toEqual([
      {
        path: '/route/clip/v2/resource/light/light-ceiling',
        body: { dimming: { brightness: 25 } },
      },
      {
        path: '/route/clip/v2/resource/grouped_light/group-office',
        body: { on: { on: false } },
      },
    ]);
    expect(page.findText('Was 25%')).toBeDefined();
  },
  timeoutMs,
);

it(
  'asks the App to draw the page again every ten seconds, so a change made in the Hue app shows',
  async () => {
    const home = await startHome();
    const page = await connected(home);
    const [deskLamp] = home.hue.home.lights;

    expect(
      await home.test.pages.draw({ path: '/', serverDevice: true }),
    ).toMatchObject({ every: 10_000 });

    if (deskLamp) deskLamp.on = false;
    await home.test.clock.advance(10_000);
    await page.draw();

    expect(shown(page, toggleOf(desk))).toBe('false');
  },
  timeoutMs,
);

it(
  'says when Hue cannot be reached, and reads again on Try again',
  async () => {
    const home = await startHome();

    await connected(home);
    home.hue.fail({
      status: 503,
      json: { errors: [{ description: 'Bridge is offline' }], data: [] },
    });
    await home.test.pages.draw({ path: '/', serverDevice: true, pull: true });

    const page = await homePage(home);

    expect(page.find(homeWords.failed).props).toMatchObject({
      tone: 'danger',
      description: 'Bridge is offline',
    });
    home.hue.heal();
    const again = await page.press(homeWords.retry);

    expect(again.findText('Desk lamp')).toBeDefined();
  },
  timeoutMs,
);

it(
  'asks to connect the Bridge again when Hue no longer knows its application key',
  async () => {
    const home = await startHome();

    await connected(home);
    home.hue.fail({
      status: 403,
      json: { errors: [{ description: 'unauthorized user' }], data: [] },
    });
    await home.test.pages.draw({ path: '/', serverDevice: true, pull: true });

    const page = await homePage(home);

    expect(page.findText(homeWords.connect)).toBeDefined();
  },
  timeoutMs,
);

it(
  'shows every light of a device that holds two, in its room',
  async () => {
    const home = await startHome();

    home.hue.home.lights.push({
      id: 'light-desk-2',
      device: 'device-desk',
      name: 'Desk strip',
      on: false,
      brightness: 30,
      xy: null,
      reachable: true,
    });
    const page = await connected(home);

    expect(page.find(sliderOf(desk)).type).toBe(lightSection);
    expect(page.find(sliderOf('light-desk-2')).type).toBe(lightSection);
    expect(page.findText('3 lights · 60%')).toBeDefined();
  },
  timeoutMs,
);

it(
  'says there are no lights yet for a Bridge with none',
  async () => {
    const home = await startHome();

    home.hue.home.lights.length = 0;
    home.hue.home.rooms.length = 0;
    const page = await connected(home);

    expect(page.findText(homeWords.noLights)).toBeDefined();
  },
  timeoutMs,
);
