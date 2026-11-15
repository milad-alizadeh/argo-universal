import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { requests } from './conversation-requests';
import { readFeed, type FeedRows } from './feed';
import { Given, Then, When } from './fixtures';
import { queueSnapshot, textOf } from './queue-observations';

Given('Agent {int} accepts steering into its held Turn', expectListedAgent);

When(
  'I steer Queued Prompt {string}',
  async ({ page }, text: string): Promise<void> => {
    const row = page.getByTestId('queued-prompt-row').filter({
      has: page.getByRole('group', { name: text, exact: true }),
    });
    await row.getByRole('button', { name: 'Steer', exact: true }).click();
    await expect(row).toHaveCount(0);
  },
);

Then(
  'the steered Prompt joins the running Turn',
  async ({ page, server, app }): Promise<void> => {
    const snapshot = await queueSnapshot(page, server.httpUrl);
    const rows = await readFeed(page, server.httpUrl);
    expect(snapshot.activeTurnId).not.toBeNull();
    expect(snapshot.promptQueue.items).toEqual([]);
    expectSteeredMessages(rows, snapshot.activeTurnId);
    expect(requests(app.requestLogPath, 'session/prompt')).toHaveLength(1);
    expect(requests(app.requestLogPath, '_session/steering')).toHaveLength(1);
    expect(requests(app.requestLogPath, 'session/cancel')).toHaveLength(0);
  },
);

function expectSteeredMessages(rows: FeedRows, turnId: string | null): void {
  const prompts = rows.filter((row) => row.sessionUpdate === 'user_message');

  expect(prompts.map((row) => textOf(row.content ?? []))).toEqual([
    'First prompt',
    'Second prompt',
  ]);
  expect(prompts.map((row) => row.turnId)).toEqual([turnId, turnId]);
}
