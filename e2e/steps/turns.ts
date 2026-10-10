import type { Page } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { sessionId } from './feed';
import { Given, Then } from './fixtures';
import { startSession } from './live-session';
import { mutate, query } from './server-query';

const CompletedRow = z.object({
  sessionUpdate: z.string(),
  turnId: z.string(),
  state: z.literal('settled'),
  content: z.array(z.object({ type: z.literal('text'), text: z.string() })),
});
const CompletedFeed = z.object({
  rows: z.tuple([CompletedRow, CompletedRow, CompletedRow, CompletedRow]),
});
const readCompletedPromptFeed = (
  page: Page,
  httpUrl: string,
): Promise<z.infer<typeof CompletedFeed>> =>
  query({
    page,
    httpUrl,
    procedure: 'feed.page',
    input: { sessionId: sessionId(page), direction: 'tail' },
    output: CompletedFeed,
  });
const promptRowKinds = [
  'user_message',
  'agent_message',
  'user_message',
  'agent_message',
];
const expectSeparatePromptTurns = ({
  rows,
}: z.infer<typeof CompletedFeed>): void => {
  const [firstPrompt, firstReply, secondPrompt, secondReply] = rows;
  expect(rows.map((row) => row.sessionUpdate)).toEqual(promptRowKinds);
  expect(firstPrompt.content).toEqual([{ type: 'text', text: 'First prompt' }]);
  expect(secondPrompt.content).toEqual([
    { type: 'text', text: 'Second prompt' },
  ]);
  expect(firstPrompt.turnId).toBe(firstReply.turnId);
  expect(secondPrompt.turnId).toBe(secondReply.turnId);
  expect(firstPrompt.turnId).not.toBe(secondPrompt.turnId);
};
Then(
  'both submitted prompts have separate completed Turns',
  async ({ page, server }): Promise<void> => {
    await expect(
      page
        .getByTestId('feed-scroll')
        .getByText('The shared fixture completed this Turn.', { exact: true }),
    ).toHaveCount(2);
    expectSeparatePromptTurns(
      await readCompletedPromptFeed(page, server.httpUrl),
    );
  },
);

Given('a Session with one completed Turn', async ({ page }): Promise<void> => {
  await startSession(page, 'First prompt');
  await expect(
    page
      .getByTestId('feed-scroll')
      .getByText('The shared fixture completed this Turn.', { exact: true }),
  ).toBeVisible();
});

Given(
  'the Server closes the Session quietly',
  async ({ page, server }): Promise<void> => {
    await mutate({
      page,
      httpUrl: server.httpUrl,
      procedure: 'session.close',
      input: { sessionId: sessionId(page) },
    });
  },
);

Then('no alert is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('alert')).toHaveCount(0);
});
