import { expect } from '../fixtures';
import { type FeedRows, readFeed, sessionId } from './feed';
import { Given, When, Then } from './fixtures';
import { startSession } from './live-session';
import { mutate } from './server-query';

const userMessage = 'user_message';

const agentMessage = 'agent_message';

const turnEndNotice = 'notice';

const fixtureReply = 'The shared fixture completed this Turn.';

const feedScroll = 'feed-scroll';

const firstPromptText = 'First prompt';

const turnRowKinds = [
  userMessage,
  agentMessage,
  turnEndNotice,
  userMessage,
  agentMessage,
  turnEndNotice,
];

const expectSeparatePromptTurns = (rows: FeedRows): void => {
  expect(rows.map((row) => row.sessionUpdate)).toEqual(turnRowKinds);
  expect(rows.map((row) => row.state)).toEqual(
    turnRowKinds.map(() => 'settled'),
  );
  expect(rows[0]?.content).toEqual([{ type: 'text', text: firstPromptText }]);
  expect(rows[3]?.content).toEqual([{ type: 'text', text: 'Second prompt' }]);
  expectSeparateTurnIds(rows.map((row) => row.turnId));
};

const expectSeparateTurnIds = ([
  firstPrompt,
  firstReply,
  firstEnd,
  secondPrompt,
  secondReply,
  secondEnd,
]: string[]): void => {
  expect(firstPrompt).toBe(firstReply);
  expect(firstPrompt).toBe(firstEnd);
  expect(secondPrompt).toBe(secondReply);
  expect(secondPrompt).toBe(secondEnd);
  expect(firstPrompt).not.toBe(secondPrompt);
};

Then(
  'both submitted prompts have separate completed Turns',
  async ({ page, server }): Promise<void> => {
    await expect(
      page.getByTestId(feedScroll).getByText(fixtureReply, { exact: true }),
    ).toHaveCount(2);
    expectSeparatePromptTurns(await readFeed(page, server.httpUrl));
  },
);

Given('a Session with one completed Turn', async ({ page }): Promise<void> => {
  await startSession(page, firstPromptText);
  await expect(
    page.getByTestId(feedScroll).getByText(fixtureReply, { exact: true }),
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

Given('Agent 1 exits mid-Turn with stderr', async (): Promise<void> => {});

When(
  'I start a Session with the crashing Agent',
  async ({ page }): Promise<void> => {
    await startSession(page, firstPromptText);
  },
);

Then(
  'the Feed shows the Agent exit status and stderr',
  async ({ page }): Promise<void> => {
    const feed = page.getByTestId(feedScroll);
    await expect(
      feed.getByText('Agent exited with status 17', { exact: true }),
    ).toBeVisible();
    await expect(
      feed.getByText('Agent fixture failed', { exact: true }),
    ).toBeVisible();
  },
);

Then(
  'the resumed Agent completes the next Turn',
  async ({ page }): Promise<void> => {
    const feed = page.getByTestId(feedScroll);
    await expect(
      feed.getByText('Second prompt', { exact: true }),
    ).toBeVisible();
    await expect(feed.getByText(fixtureReply, { exact: true })).toHaveCount(1);
  },
);
