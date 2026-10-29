import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import {
  snapshotEvent,
  promptInput,
  rowUpsertEvent,
} from './session-machine.test.mocks';

function isRunningSnapshot(event: FeedSubscribeOutput): boolean {
  return event.type === snapshotEvent && event.snapshot.state === 'running';
}

it('attaches live Feed updates when a subscription starts while the Session opens', async () => {
  const opening = Promise.withResolvers<NewSessionRequest>();
  const ready = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [{ type: 'hold' }],
    responses: {
      'session/new': [{ received: opening, waitFor: ready.promise }],
    },
  });

  const created = { sessionId: 'session-1' };

  const prompting = host.caller.session.prompt({
    ...created,
    prompt: promptInput,
  });

  await opening.promise;

  const updates = (
    await host.caller.feed.subscribe({
      ...created,
      after: null,
    })
  )[Symbol.asyncIterator]();

  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { maxRevision: 0 },
  });
  ready.resolve();
  await prompting;

  type Update = Awaited<ReturnType<typeof updates.next>>['value'];

  async function nextRunningSnapshot(): Promise<Update> {
    let event = (await updates.next()).value;

    while (event && !isRunningSnapshot(event))
      event = (await updates.next()).value;

    return event;
  }

  async function nextRow(): Promise<Update> {
    let row = (await updates.next()).value;

    while (row && row.type !== rowUpsertEvent)
      row = (await updates.next()).value;

    return row;
  }

  const event = await nextRunningSnapshot();
  expect(event).toMatchObject({
    type: snapshotEvent,
    snapshot: { state: 'running', maxRevision: 1 },
  });
  const row = await nextRow();
  expect(row).toMatchObject({
    type: rowUpsertEvent,
    row: { sessionUpdate: 'user_message' },
  });
  await updates.return?.();
});
