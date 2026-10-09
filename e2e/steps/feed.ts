import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Then } from './fixtures';
import { query } from './server-query';

const FeedPage = z.object({
  rows: z.array(
    z.object({
      sessionUpdate: z.string(),
      content: z.array(z.record(z.string(), z.unknown())),
    }),
  ),
});
export type FeedRows = z.infer<typeof FeedPage>['rows'];

export function sessionId(page: Page): string {
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) throw new Error('No Session id in the URL');
  return id;
}

export async function readFeed(page: Page, httpUrl: string): Promise<FeedRows> {
  return (
    await query({
      page,
      httpUrl,
      procedure: 'feed.page',
      input: { sessionId: sessionId(page), direction: 'tail' },
      output: FeedPage,
    })
  ).rows;
}

Then(
  'the Agent replies {string}',
  async ({ page }, reply: string): Promise<void> => {
    await expect(
      page.getByTestId('feed-scroll').getByText(reply, { exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the Session Feed contains the text prompt {string}',
  async ({ page, server }, prompt: string): Promise<void> => {
    const [row] = await readFeed(page, server.httpUrl);
    expect(row).toMatchObject({
      sessionUpdate: 'user_message',
      content: [{ type: 'text', text: prompt }],
    });
  },
);
