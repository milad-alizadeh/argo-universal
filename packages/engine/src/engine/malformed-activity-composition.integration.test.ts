import { feedRow } from '@repo/db/schema';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startLiveHeaderHost } from '#mocks/live-header-composition';
import { publishHeaderConfiguration } from '#mocks/live-header-configuration';

it('keeps the Feed subscription open after malformed stored activity', async (): Promise<void> => {
  const context = await startLiveHeaderHost();
  const { database, caller, subscription } = context;
  const initial = (await subscription.next()).value;

  if (initial?.type !== 'snapshot')
    throw new Error('Expected initial snapshot');
  database
    .insert(feedRow)
    .values({
      sessionId: 'session-1',
      id: 'malformed',
      position: 500,
      revision: 500,
      turnId: initial.snapshot.activeTurnId,
      state: 'settled',
      sessionUpdate: 'agent_thought',
      payloadVersion: 1,
      payload: { messageId: 'malformed', content: 'invalid' },
    })
    .run();
  database.$client
    .prepare('UPDATE session SET max_revision = 500 WHERE id = ?')
    .run('session-1');

  const reported = vi
    .spyOn(console, 'error')
    .mockImplementation((): void => {});

  onTestFinished((): void => reported.mockRestore());
  const next = subscription.next();
  await publishHeaderConfiguration(context, 'large');
  await expect(next).resolves.toMatchObject({
    done: false,
    value: {
      type: 'snapshot',
      snapshot: {
        configOptions: expect.arrayContaining([
          expect.objectContaining({ configId: 'model', currentValue: 'large' }),
        ]),
        liveHeader: { text: 'Working', source: { type: 'working' } },
      },
    },
  });
  expect(reported).toHaveBeenCalledWith(
    'sessions: rejected live-header shape #1',
    expect.anything(),
  );
  const following = subscription.next();
  await publishHeaderConfiguration(context, 'small');
  await expect(following).resolves.toMatchObject({
    done: false,
    value: {
      type: 'snapshot',
      snapshot: {
        configOptions: expect.arrayContaining([
          expect.objectContaining({ configId: 'model', currentValue: 'small' }),
        ]),
      },
    },
  });
  await expect(
    caller.feed.page({
      sessionId: 'session-1',
      direction: 'tail',
      limit: 50,
    }),
  ).rejects.toThrow('Invalid input: expected array, received string');

  const catchUp = (
    await caller.feed.subscribe({
      sessionId: 'session-1',
      after: { epoch: initial.snapshot.epoch, revision: 0 },
    })
  )[Symbol.asyncIterator]();

  await expect(catchUp.next()).rejects.toThrow(
    'Invalid input: expected array, received string',
  );
});
