import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { afterFrames, oldestHistoryMessage } from './feed-history-scroll';
import { Given, When, Then } from './fixtures';
import { openSessionRow, sessionRow, startSession } from './live-session';

const feed = (page: Page): Locator =>
  page.getByTestId('feed-scroll').filter({ visible: true });

// How far below the Feed's top edge a message is drawn.
async function topInFeed(page: Page, message: Locator): Promise<number> {
  const box = await message.boundingBox();
  const feedBox = await feed(page).boundingBox();

  if (!box || !feedBox) throw new Error('The reading position is missing');

  return box.y - feedBox.y;
}

const oldestFeedPosition = new WeakMap<Page, number>();

Given('the browser clock can advance for Feed expiration', async ({ page }) => {
  await page.clock.install();
});

When("I remember the oldest Feed message's position", async ({ page }) => {
  const row = feed(page).getByText(oldestHistoryMessage, { exact: true });
  await expect(row).toBeInViewport();
  oldestFeedPosition.set(page, await topInFeed(page, row));
});

When('I create three other Sessions', async ({ page }) => {
  for (const title of ['First other', 'Second other', 'Third other'])
    await startSession(page, title);
});

When('the Feed cache expires', async ({ page }) => {
  await page.clock.fastForward(600_001);
});

Then(
  'the oldest Feed message returns to its remembered position',
  async ({ page }) => {
    const before = oldestFeedPosition.get(page);

    if (before === undefined)
      throw new Error('No reading position was remembered');
    const row = feed(page).getByText(oldestHistoryMessage, { exact: true });

    await expect(async () => {
      await expect(row).toBeInViewport();
      expect(Math.abs((await topInFeed(page, row)) - before)).toBeLessThan(30);
    }).toPass({ timeout: 20_000 });
  },
);

When('I return to the long Feed', async ({ page }) => {
  await openSessionRow(
    page,
    sessionRow(page, 'Build a long history'),
    'Build a long history',
  );
});

// Every Session of this Agent holds the long history, so its title is no longer drawn in its Feed; the pressed row says it opened.
When(
  'I switch to the Session {string}',
  async ({ page }, title: string): Promise<void> => {
    await openSessionRow(page, sessionRow(page, title), title);
  },
);

interface ReadingPlace {
  message: string;
  top: number;
}

const readingPlaces = new WeakMap<Page, ReadingPlace>();

// The list draws only the rows near the view, so the middle one of those is in or beside it.
async function middleDrawnMessage(page: Page): Promise<string> {
  const drawn = feed(page).getByText(/^History message \d+\.$/);
  const middle = drawn.nth(Math.floor((await drawn.count()) / 2));

  return (await middle.textContent()) ?? '';
}

// Clear of the Feed's edges, so a pixel of drift cannot take the row out of view.
const clearOfEdge = 120;

async function placeBelowTop(page: Page, row: Locator): Promise<void> {
  await row.scrollIntoViewIfNeeded({ timeout: 1000 });
  const top = await topInFeed(page, row);

  await feed(page).evaluate((element, by) => {
    element.scrollTop += by;
  }, top - clearOfEdge);
}

// A Feed that lost its place lands at its top, so the place to keep is away from both ends.
When('I scroll the Feed to the middle of its history', async ({ page }) => {
  await feed(page).evaluate((element) => {
    element.scrollTop = element.scrollHeight / 2;
  });

  // Rows measure as they come into view, so the place is kept once two readings agree.
  await expect(async () => {
    const message = await middleDrawnMessage(page);
    expect(message).not.toBe(oldestHistoryMessage);
    const row = feed(page).getByText(message, { exact: true });
    await placeBelowTop(page, row);
    const top = await topInFeed(page, row);
    await afterFrames(page, 10);

    expect(await topInFeed(page, row)).toBe(top);
    readingPlaces.set(page, { message, top });
  }).toPass({ timeout: 20_000 });
});

Then('the Feed is at the place I left it', async ({ page }) => {
  const place = readingPlaces.get(page);

  if (!place) throw new Error('No reading place was remembered');
  const row = feed(page).getByText(place.message, { exact: true });

  await expect(async () => {
    expect(Math.abs((await topInFeed(page, row)) - place.top)).toBeLessThan(30);
  }).toPass({ timeout: 20_000 });
});
