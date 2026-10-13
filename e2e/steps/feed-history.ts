import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { sessionId } from './feed';
import { Given, When, Then } from './fixtures';
import { query } from './server-query';
import { agentWork } from './timeouts';

const firstMessage = 'History message 1.';
const lastMessage = 'Latest history reply.';
const feedScroll = 'feed-scroll';
const FeedPage = z.object({
  hasOlder: z.boolean(),
  rows: z.array(
    z.object({
      turnId: z.string().nullable(),
      content: z.unknown().optional(),
    }),
  ),
});
type FeedRow = z.infer<typeof FeedPage>['rows'][number];

function hasText(row: FeedRow, text: string): boolean {
  return JSON.stringify(row.content ?? null).includes(text);
}

async function storedPage(
  page: Page,
  httpUrl: string,
): Promise<z.infer<typeof FeedPage>> {
  return query({
    page,
    httpUrl,
    procedure: 'feed.page',
    input: { sessionId: sessionId(page), direction: 'tail', limit: 150 },
    output: FeedPage,
  });
}

async function historyIsStored(page: Page, httpUrl: string): Promise<boolean> {
  const feed = await storedPage(page, httpUrl);
  return feed.hasOlder && feed.rows.some((row) => hasText(row, lastMessage));
}

function endsTurn(row: FeedRow | undefined, turnId: string): boolean {
  if (!row) return false;
  return row.turnId === turnId && hasText(row, lastMessage);
}

async function nextTurnIsStored(page: Page, httpUrl: string): Promise<boolean> {
  const { rows } = await storedPage(page, httpUrl);
  const prompt = rows.find((row) =>
    hasText(row, 'Continue after paging history'),
  );
  if (!prompt?.turnId) return false;
  return endsTurn(rows.at(-1), prompt.turnId);
}

Given(
  'Agent {int} supplies a long Feed history',
  async ({ page, server }, ordinal: number): Promise<void> => {
    expect(await readAgent(page, server.httpUrl, ordinal)).toMatchObject({
      availability: 'available',
    });
  },
);

When('I reopen the stored long Feed', async ({ page, server }) => {
  await expect
    .poll(() => historyIsStored(page, server.httpUrl), agentWork)
    .toBe(true);
  await page.goto(new URL('/', page.url()).href);
  await page.getByRole('button', { name: /^Build a long history,/ }).click();
});

Then('the Feed opens at its newest history message', async ({ page }) => {
  const feed = page.getByTestId(feedScroll);
  await expect(feed.getByText(lastMessage, { exact: true })).toBeInViewport();
  await expect(feed.getByText(firstMessage, { exact: true })).toHaveCount(0);
});

When('I scroll the Feed to its oldest message', async ({ page }) => {
  const feed = page.getByTestId(feedScroll);
  const oldest = feed.getByText(firstMessage, { exact: true });
  // An older page lands at the top, then the Feed keeps its place and moves it up out of view, so scroll again until the oldest message stays.
  await expect(async () => {
    await feed.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(oldest).toBeInViewport({ timeout: 1000 });
    await expect(
      page.getByRole('progressbar', { name: 'Loading earlier' }),
    ).toHaveCount(0);
    await afterFrames(page, 10);
    await expect(oldest).toBeInViewport({ timeout: 100 });
  }).toPass(agentWork);
});

// The browser's frame callback, used inside page.evaluate; the e2e project has no DOM lib.
declare const requestAnimationFrame: (callback: () => void) => number;

// Waits for the page to draw this many frames, so a pending scroll adjustment lands.
async function afterFrames(page: Page, frames: number): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let left = count;
        const tick = (): void => {
          left -= 1;
          if (left > 0) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

Then('the Feed shows its oldest history message', async ({ page }) => {
  await expect(
    page.getByTestId(feedScroll).getByText(firstMessage, { exact: true }),
  ).toBeInViewport();
});

When('I return to the newest Feed message', async ({ page }) => {
  await page.getByTestId(feedScroll).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByTestId(feedScroll).getByText(lastMessage, { exact: true }),
  ).toBeInViewport();
});

Then(
  'the Feed shows the new live Turn after its stored history',
  async ({ page, server }) => {
    const feed = page.getByTestId(feedScroll);
    await expect
      .poll(() => nextTurnIsStored(page, server.httpUrl), agentWork)
      .toBe(true);
    await expect(
      feed.getByText(lastMessage, { exact: true }).last(),
    ).toBeInViewport();
  },
);
