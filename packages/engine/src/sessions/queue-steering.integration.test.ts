import { QueueEditToken } from '@repo/contracts';
import { expect, it } from 'vitest';
import { waitFor } from 'xstate';
import { firstQueued, startSteeringFixture } from '#mocks/queue-steering';

it('injects once into the same Turn and commits its Feed message with queue removal', async () => {
  const fixture = await startSteeringFixture();
  const { caller, sessionId, actor } = fixture;
  const before = actor.getSnapshot().context.activeTurnId;
  const row = firstQueued(fixture);

  const command = {
    action: 'steer' as const,
    id: row.id,
    revision: row.revision,
  };

  const sent = caller.session.queue({ sessionId, command });

  expect(await fixture.received.promise).toEqual({
    sessionId: 'owned-1',
    prompt: row.prompt,
    _meta: { steering: { idleBehavior: 'promptRequired' } },
  });
  expect(firstQueued(fixture)).toEqual(row);
  await expect(
    caller.session.queue({ sessionId, command }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await fixture.queue('Appended while steering');
  fixture.result.resolve({ outcome: 'injected' });
  await sent;
  expect(actor.getSnapshot().context.activeTurnId).toBe(before);
  expect(
    actor.getSnapshot().context.promptQueue.items.map((item) => item.prompt),
  ).toEqual([
    [{ type: 'text', text: 'Keep queued' }],
    [{ type: 'text', text: 'Appended while steering' }],
  ]);
  expect(fixture.prompts).toHaveLength(1);
  const page = await caller.feed.page({ sessionId, direction: 'tail' });
  expect(
    page.rows.filter((item) => item.sessionUpdate === 'user_message'),
  ).toMatchObject([
    { turnId: before, content: [{ type: 'text', text: 'Original Turn' }] },
    { turnId: before, content: row.prompt },
  ]);
  await expect(
    caller.session.queue({ sessionId, command }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
});

it.each(['promptRequired', 'failed', 'startedNewTurn', 'malformed'])(
  'keeps the item and releases the hold after %s',
  async (outcome) => {
    const fixture = await startSteeringFixture();
    const row = firstQueued(fixture);

    const sent = fixture.caller.session.queue({
      sessionId: fixture.sessionId,
      command: { action: 'steer', id: row.id, revision: row.revision },
    });

    const refused = sent.catch((error: Error) => error);

    await fixture.received.promise;
    fixture.result.resolve({ outcome });
    expect(await refused).toBeInstanceOf(Error);
    expect(firstQueued(fixture)).toEqual(row);
    expect(fixture.actor.getSnapshot().context.queueSteering).toBeNull();
    expect(fixture.actor.getSnapshot().context.queueHolds).toEqual({});
    expect(fixture.prompts).toHaveLength(1);
  },
);

it('rejects stale revisions and Prompts held by another App before contacting the adapter', async () => {
  const fixture = await startSteeringFixture();
  const { caller, sessionId } = fixture;
  const row = firstQueued(fixture);
  await expect(
    caller.session.queue({
      sessionId,
      command: {
        action: 'steer',
        id: row.id,
        revision: 99,
      },
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  await caller.session.queue({
    sessionId,
    command: {
      action: 'hold',
      id: row.id,
      revision: row.revision,
      token: QueueEditToken.parse('other-app'),
    },
  });
  await expect(
    caller.session.queue({
      sessionId,
      command: {
        action: 'steer',
        id: row.id,
        revision: row.revision,
      },
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  expect(fixture.actor.getSnapshot().context.queueHolds[row.id]).toBe(
    'other-app',
  );
  expect(fixture.actor.getSnapshot().context.queueSteering).toBeNull();
});

it('blocks queue advancement and direct Prompts until an in-flight steer settles', async () => {
  const fixture = await startSteeringFixture();
  const row = firstQueued(fixture);

  const sent = fixture.caller.session.queue({
    sessionId: fixture.sessionId,
    command: { action: 'steer', id: row.id, revision: row.revision },
  });

  await fixture.received.promise;
  fixture.turnEnded.resolve();
  await waitFor(
    fixture.actor,
    (snapshot) => snapshot.context.activeTurnId === null,
  );
  expect(fixture.prompts).toHaveLength(1);
  expect(firstQueued(fixture)).toEqual(row);
  await expect(
    fixture.caller.session.prompt({
      sessionId: fixture.sessionId,
      prompt: [{ type: 'text', text: 'Do not overtake the steer' }],
    }),
  ).rejects.toMatchObject({ code: 'CONFLICT' });
  fixture.result.resolve({ outcome: 'injected' });
  await sent;
  await expect.poll(() => fixture.prompts.length).toBe(2);
  expect(fixture.prompts[1]?.prompt).toEqual([
    { type: 'text', text: 'Keep queued' },
  ]);
});

it('retains the item after an adapter request throws', async () => {
  const fixture = await startSteeringFixture();
  const row = firstQueued(fixture);

  const sent = fixture.caller.session.queue({
    sessionId: fixture.sessionId,
    command: { action: 'steer', id: row.id, revision: row.revision },
  });

  const refused = sent.catch((error: Error) => error);
  await fixture.received.promise;
  fixture.result.reject(new Error('Adapter refused steering'));
  expect(await refused).toMatchObject({
    code: 'INTERNAL_SERVER_ERROR',
    cause: { data: { details: 'Adapter refused steering' } },
  });
  expect(firstQueued(fixture)).toEqual(row);
  expect(fixture.actor.getSnapshot().context.queueHolds).toEqual({});
});
