import { expect } from '../fixtures';
import { type FeedRows, readFeed, sessionId } from './feed';
import { Given, Then } from './fixtures';
import { startSession } from './live-session';
import { mutate } from './server-query';

const promptRowKinds = [
  'user_message',
  'agent_message',
  'user_message',
  'agent_message',
];
const expectSeparatePromptTurns = (rows: FeedRows): void => {
  expect(rows.map((row) => row.sessionUpdate)).toEqual(promptRowKinds);
  expect(rows.map((row) => row.state)).toEqual(
    promptRowKinds.map(() => 'settled'),
  );
  expect(rows[0]?.content).toEqual([{ type: 'text', text: 'First prompt' }]);
  expect(rows[2]?.content).toEqual([{ type: 'text', text: 'Second prompt' }]);
  const [firstPrompt, firstReply, secondPrompt, secondReply] = rows.map(
    (row) => row.turnId,
  );
  expect(firstPrompt).toBe(firstReply);
  expect(secondPrompt).toBe(secondReply);
  expect(firstPrompt).not.toBe(secondPrompt);
};
Then(
  'both submitted prompts have separate completed Turns',
  async ({ page, server }): Promise<void> => {
    await expect(
      page
        .getByTestId('feed-scroll')
        .getByText('The shared fixture completed this Turn.', { exact: true }),
    ).toHaveCount(2);
    expectSeparatePromptTurns(await readFeed(page, server.httpUrl));
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
