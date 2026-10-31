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
  if (places[fadeWatched].length > 0) fades.push(faded());
  requestAnimationFrame(sample);
}`;

// How many elements inside the page pane draw below full opacity right now. A position check cannot see a fade, so this is read on the same frame as the places.
const fadedScript = `() => {
  const pane = document.querySelector('[data-testid="' + fadeWatched + '"]');
  if (!pane) return 0;
  let count = 0;
  for (const node of pane.querySelectorAll('*')) {
    if (Number(getComputedStyle(node).opacity) < 1) count += 1;
  }
  return count;
}`;

const watchPanes = (names: readonly string[]): string => `{
  const names = ${JSON.stringify(names)};
  const places = (window.panePlaces = Object.fromEntries(
    names.map((name) => [name, []]),
  ));
  const fadeWatched = ${JSON.stringify(pagePane)};
  const fades = (window.paneFades = []);
  const faded = ${fadedScript};
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

// Frames the page pane drew with more faded elements than it has at rest. Rest is the lower of the first and last reading: the first may already be mid-fade, the last is after the page settled.
async function fadedFrames(page: Page): Promise<number[]> {
  await settle(page);
  const counts = await page.evaluate<number[]>('window.paneFades');

  expect(counts.length, 'the page pane was never read').toBeGreaterThan(0);
  const rest = Math.min(counts[0] ?? 0, counts.at(-1) ?? 0);

  return counts.filter((count) => count > rest);
}

/*
 * A Session switch mounts a new page, and LegendList draws a freshly mounted list at opacity 0 until it is ready to
 * render (#1444). That is a library behaviour the Frame accepts, so this pins its bound rather than its absence: the
 * page pane may be faded for one frame, never more. A frame is one requestAnimationFrame callback, which the browser
 * calls at most once per frame, so a window of a few milliseconds cannot be counted twice; a window that outlasts
 * a frame is the regression this catches.
 */
Then(
  'the page pane faded for at most one frame',
  async ({ page }): Promise<void> => {
    const faded = await fadedFrames(page);

    expect(
      faded.length,
      `the page pane was faded on ${faded.length} frames`,
    ).toBeLessThanOrEqual(1);
  },
);
