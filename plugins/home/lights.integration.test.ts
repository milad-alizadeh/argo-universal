import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { homeWords } from './home-words';
import { applicationKey } from './mocks/hue-data';
import { shown, sliderOf, toggleOf } from './mocks/controls';
import { connected, homePage, startHome } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const desk = 'light-desk';

const ceiling = 'light-ceiling';

it(
  'shows each room with its own card and its lights’ cards, then the lights in no room, each with power and brightness',
  async () => {
    const page = await connected(await startHome());

    expect(page.find('Office').type).toBe('Text');
    expect(page.find(homeWords.allLights).props.subtitle).toBe('2 lights');
    expect(page.find('Desk lamp').type).toBe('Card');
    expect(page.find(homeWords.otherLights).type).toBe('Text');
    expect(shown(page, toggleOf(desk))).toBe('true');
    expect(shown(page, toggleOf(ceiling))).toBe('false');
    expect(shown(page, sliderOf('light-porch'))).toBe('100');
    expect(shown(page, toggleOf('group-office'))).toBe('true');
    expect(page.find(sliderOf(desk)).props).toMatchObject({ min: 1, max: 100, valueLabel: '80%' });
  },
  timeoutMs,
);

it(
  'switches a light off with its Toggle, sending its application key, and shows it off',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    await page.act(toggleOf(desk), 'onValueChange', false);

    expect(home.hue.puts()).toEqual([
      { path: '/route/clip/v2/resource/light/light-desk', body: { on: { on: false } }, key: applicationKey },
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
    await page.act(toggleOf('group-office'), 'onValueChange', false);

    expect(home.hue.puts().map(({ path, body }) => ({ path, body }))).toEqual([
      { path: '/route/clip/v2/resource/light/light-ceiling', body: { dimming: { brightness: 25 } } },
      { path: '/route/clip/v2/resource/grouped_light/group-office', body: { on: { on: false } } },
    ]);
    expect(shown(page, sliderOf(ceiling))).toBe('25');
  },
  timeoutMs,
);

it(
  'asks the App to draw the page again every ten seconds, so a change made in the Hue app shows',
  async () => {
    const home = await startHome();
    const page = await connected(home);
    const [deskLamp] = home.hue.home.lights;

    expect(await home.test.pages.draw({ path: '/', serverDevice: true })).toMatchObject({ every: 10_000 });

    if (deskLamp) deskLamp.on = false;
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
    home.hue.fail({ status: 503, json: { errors: [{ description: 'Bridge is offline' }], data: [] } });
    const page = await homePage(home);

    expect(page.find(homeWords.failed).props).toMatchObject({ tone: 'danger', description: 'Bridge is offline' });
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
    home.hue.fail({ status: 403, json: { errors: [{ description: 'unauthorized user' }], data: [] } });
    const page = await homePage(home);

    expect(page.findText(homeWords.connect)).toBeDefined();
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
