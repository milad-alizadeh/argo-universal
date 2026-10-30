import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { When, Then } from './fixtures';

// The Frame's panes, by the test ID each draws under.
const listPane = 'desktop-list';

const pagePane = 'desktop-detail';

const workbenchPane = 'desktop-workbench';

// The Feed's own viewport, inside the page pane: the content a Session switch swaps.
const feed = 'feed-scroll';

// Each watched pane's place on every frame since the watch began.
type PanePlaces = Record<string, (string | null)[]>;

// Where one pane sits now, as `left:width`, or null while it is not drawn.
const placeScript = `(name) => {
  const node = document.querySelector('[data-testid="' + name + '"]');
  if (!node) return null;
  const box = node.getBoundingClientRect();
  return Math.round(box.left) + ':' + Math.round(box.width);
}`;

/*
 * Reads every pane's place at each paint. A Frame motion runs for 280ms and both starts and settles between two
 * steps, so a check that reads the panes once cannot see it; this reads them on every frame a motion runs on. A pane
 * is read from the frame it is first drawn on, so the App's own mount is not read as a pane going.
 */
const sampleScript = `() => {
  for (const name of names) {
    const at = place(name);
    if (at !== null || places[name].length > 0) places[name].push(at);
  }
  requestAnimationFrame(sample);
}`;

const watchPanes = (names: readonly string[]): string => `{
  const names = ${JSON.stringify(names)};
  const places = (window.panePlaces = Object.fromEntries(
    names.map((name) => [name, []]),
  ));
  const place = ${placeScript};
  const sample = ${sampleScript};
  sample();
}`;

When('I watch the Frame panes', async ({ page }): Promise<void> => {
  await page.evaluate(watchPanes([listPane, pagePane, workbenchPane, feed]));
});

const readPlaces = async (page: Page): Promise<PanePlaces> =>
  page.evaluate<PanePlaces>('window.panePlaces');

// Longer than the Frame's 280ms motion, counted in frames rather than milliseconds: a loaded Mac paints the motion slowly, and both are paced by the same clock.
const settleFrames = 45;

// Waits for the panes to be read on `settleFrames` more frames, so a motion that started with the step before has ended.
async function settle(page: Page): Promise<void> {
  const taken = (await readPlaces(page))[listPane]?.length ?? 0;

  await page.waitForFunction(
    `window.panePlaces['${listPane}'].length > ${taken + settleFrames}`,
  );
}

async function assertStill(page: Page, names: string[]): Promise<void> {
  await settle(page);
  const places = await readPlaces(page);

  for (const name of names) {
    const taken = places[name] ?? [];

    expect(taken.length, `${name} was never read`).toBeGreaterThan(0);
    expect(
      taken.filter((place) => place === null),
      `${name} was not drawn`,
    ).toHaveLength(0);
    // One place across every frame: the pane neither moved nor changed width.
    expect([...new Set(taken)], `${name} moved`).toHaveLength(1);
  }
}

Then('the Frame sidebar never moved', async ({ page }): Promise<void> => {
  await assertStill(page, [listPane]);
});

Then('the Frame panes never moved', async ({ page }): Promise<void> => {
  await assertStill(page, [listPane, pagePane, workbenchPane]);
});

Then('the Feed never moved', async ({ page }): Promise<void> => {
  await assertStill(page, [feed]);
});
