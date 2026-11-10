import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { lastMessage } from './feed-history';
import {
  afterFrames,
  oldestHistoryMessage,
  scrollToOldestHistoryMessage,
  shownFeed,
} from './feed-history-scroll';
import { When, Then } from './fixtures';
import { openSessionRow, sessionRow, startSession } from './live-session';

const longFeed = 'Build a long history';

const otherSessions = ['First other', 'Second other'] as const;

// Every Session of this Agent holds the long history, so its title is not drawn in its Feed; the pressed row says it opened.
const openSession = (page: Page, title: string): Promise<void> =>
  openSessionRow(page, sessionRow(page, title), title);

export const returnToLongFeed = (page: Page): Promise<void> =>
  openSession(page, longFeed);

export async function topInFeed(page: Page, message: Locator): Promise<number> {
  const box = await message.boundingBox();
  const feedBox = await shownFeed(page).boundingBox();

  if (!box || !feedBox) throw new Error('The reading place is missing');

  return box.y - feedBox.y;
}

interface ReadingPlace {
  message: string;
  top: number;
}

const readingPlaces = new WeakMap<Page, ReadingPlace>();

// Rows measure as they come into view, so a place is kept once it holds for this many frames.
const settleFrames = 10;

async function keepPlace(page: Page, message: string): Promise<void> {
  const row = shownFeed(page).getByText(message, { exact: true }).last();
  const top = await topInFeed(page, row);
  await afterFrames(page, settleFrames);

  expect(await topInFeed(page, row)).toBe(top);
  readingPlaces.set(page, { message, top });
}

// The list draws only the rows near the view, so the middle one of those is in or beside it.
async function middleDrawnMessage(page: Page): Promise<string> {
  const drawn = shownFeed(page).getByText(/^History message \d+\.$/);
  const middle = drawn.nth(Math.floor((await drawn.count()) / 2));

  return (await middle.textContent()) ?? '';
}

// A row on the Feed's edge leaves the view on a pixel of drift, so the row read sits this far below the top.
const clearOfEdge = 120;

async function scrollBelowTop(page: Page, message: string): Promise<void> {
  const row = shownFeed(page).getByText(message, { exact: true });
  await row.scrollIntoViewIfNeeded({ timeout: 1000 });
  const top = await topInFeed(page, row);

  await shownFeed(page).evaluate((element, by) => {
    element.scrollTop += by;
  }, top - clearOfEdge);
}

// A Feed that lost its place lands at its top, so this place is away from both ends, with every older page loaded.
async function readToMiddle(page: Page): Promise<void> {
  await scrollToOldestHistoryMessage(page);
  await shownFeed(page).evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2;
  });

  await expect(async () => {
    const message = await middleDrawnMessage(page);
    expect(message).not.toBe(oldestHistoryMessage);
    await scrollBelowTop(page, message);
    await keepPlace(page, message);
  }).toPass({ timeout: 20_000 });
}

// The Feed opens at its end, so the place is its newest message.
async function readToEnd(page: Page): Promise<void> {
  await expect(async () => {
    await expect(
      shownFeed(page).getByText(lastMessage, { exact: true }).last(),
    ).toBeInViewport();
    await keepPlace(page, lastMessage);
  }).toPass({ timeout: 20_000 });
}

const readTo = { middle: readToMiddle, end: readToEnd };

const isPlace = (place: string): place is keyof typeof readTo =>
  Object.hasOwn(readTo, place);

// Starting a Session swaps the kept pages for New Session, so each other Session is opened again to be kept beside the long Feed.
async function keepOtherSessions(page: Page): Promise<void> {
  for (const title of otherSessions) await startSession(page, title);

  await openSession(page, otherSessions[0]);
  await returnToLongFeed(page);
}

When(
  'I read the long Feed to its {word} beside two other recent Sessions',
  async ({ page }, place: string): Promise<void> => {
    if (!isPlace(place)) throw new Error(`No reading place named ${place}`);

    await keepOtherSessions(page);
    await readTo[place](page);
  },
);

// The long Feed's page is the one just left, then the third one kept, before it is shown again.
When('I visit both other Sessions and return', async ({ page }) => {
  for (const title of otherSessions) await openSession(page, title);

  await returnToLongFeed(page);
});

Then('the Feed is at the place I left it', async ({ page }) => {
  const place = readingPlaces.get(page);

  if (!place) throw new Error('No reading place was remembered');
  const row = shownFeed(page).getByText(place.message, { exact: true }).last();

  await expect(async () => {
    expect(Math.abs((await topInFeed(page, row)) - place.top)).toBeLessThan(30);
  }).toPass({ timeout: 20_000 });
});
