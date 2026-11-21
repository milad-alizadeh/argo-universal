import { serialiseOnOAuthPort } from '@argo/plugin-kit/testing/oauth-port';
import { expect, it } from 'vitest';
import { applicationKey } from './mocks/hue-data';
import { connected, startHome } from './mocks/journey';

serialiseOnOAuthPort();

const timeoutMs = 30_000;

const deskEdit = 'Edit Desk lamp';

const ceilingEdit = 'Edit Ceiling';

const roomEdit = 'Edit All lights';

const inspector = (node: { type: string }): boolean =>
  node.type === 'Inspector';

const wheel = (node: { type: string }): boolean => node.type === 'ColourWheel';

it(
  'opens one light editor with an unset wheel and writes the picked colour',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    await page.press(deskEdit);
    expect(page.find(inspector).props.title).toBe('Desk lamp');
    expect(page.find(wheel).props.value).toBeUndefined();

    await page.act(wheel, 'onValueChange', { hue: 0, saturation: 50 });
    await home.test.clock.advance(150);
    expect(home.hue.puts()).toEqual([
      expect.objectContaining({
        key: applicationKey,
        path: '/route/clip/v2/resource/light/light-desk',
      }),
    ]);

    await page.press(ceilingEdit);
    expect(page.find(inspector).props.title).toBe('Ceiling');
    expect(() => page.find(wheel)).toThrow(/No node matches/);
    expect(
      page.findText('Your changes apply when the light turns on.'),
    ).toBeDefined();

    expect(page.find(inspector).props.closeLabel).toBe('Done');
    await page.act(inspector, 'onOpenChange', false);
    expect(() => page.find(inspector)).toThrow(/No node matches/);
  },
  timeoutMs,
);

it(
  'keeps the confirmed scene selected and narrows the room scenes as someone searches',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    await page.press(roomEdit);
    expect(page.find(inspector).props.title).toBe('Office scenes');
    expect(page.find('Focus').props.selected).toBe(true);

    expect(page.find(inspector).props.search).toEqual({
      label: 'Search scenes',
    });

    await page.act(inspector, 'onChangeText', 'rel');
    await home.test.clock.advance(1000);
    expect(page.find('Relax').props.selected).toBe(false);
    expect(page.findText('Focus')).toBeUndefined();

    await page.act(inspector, 'onChangeText', '');
    await home.test.clock.advance(1000);
    expect(page.find('Focus').props.selected).toBe(true);
  },
  timeoutMs,
);

it(
  'disables Edit and power for an unreachable light and room',
  async () => {
    const home = await startHome();

    for (const light of home.hue.home.lights) light.reachable = false;

    const page = await connected(home);

    expect(page.find(deskEdit).props.disabled).toBe(true);
    expect(page.find(roomEdit).props.disabled).toBe(true);
    expect(page.find('Desk lamp power').props.disabled).toBe(true);
    expect(page.findText('Check the Hue Bridge')).toBeDefined();
  },
  timeoutMs,
);

it(
  'keeps the scene marker until Hue confirms the recall',
  async () => {
    const home = await startHome();
    const page = await connected(home);

    home.hue.home.deferRecall = true;
    await page.press(roomEdit);
    await page.press('Relax');
    expect(page.find('Focus').props.selected).toBe(true);

    for (const scene of home.hue.home.scenes)
      scene.active = scene.name === 'Relax';

    await home.test.clock.advance(10_000);

    const confirmed = await home.test.clock.until(
      async () => {
        await page.draw();

        return page.find('Relax').props.selected === true;
      },
      { stepMs: 250, steps: 8 },
    );

    expect(confirmed).toBe(true);
  },
  timeoutMs,
);
