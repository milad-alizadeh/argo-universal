import type { SessionListUpdate } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { insertEndedTurn, openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import {
  finishSubscription,
  nextListChange,
  watchEngineList,
} from '#mocks/list-observation';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';

const chunks = 6;

// Longer than the list's refresh delay, so each chunk is its own publish of the list.
const betweenChunks = 130;

const pause = (ms: number): Promise<void> =>
  new Promise<void>((resolve): void => {
    setTimeout(resolve, ms);
  });

const isSession = (update: SessionListUpdate): boolean =>
  update.type === 'changed' && update.session.sessionId === 'session-1';

it('keeps a streaming Session at one activity time, so streamed chunks do not make its row differ', async (): Promise<void> => {
  const { database, remove } = openTestDatabase();
  onTestFinished(remove);
  insertEndedTurn(database);
  const completed = Promise.withResolvers<void>();

  const input = scriptedEngineInput({
    steps: [],
    responses: { 'session/prompt': [{ waitFor: completed.promise }] },
  });

  const { createCaller } = await startEngineTestHost({ database, ...input });
  const { caller, controller } = watchEngineList(createCaller);
  const stream = await caller.session.listUpdates();
  const updates = stream[Symbol.asyncIterator]();
  await nextListChange(updates, isSession);

  await caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Hello' }],
  });

  const started = await nextListChange(
    updates,
    (update): boolean =>
      isSession(update) &&
      update.type === 'changed' &&
      update.session.status === 'running',
  );

  const streamed: SessionListUpdate[] = [];
  const watching = collect(stream, streamed);

  for (let chunk = 0; chunk < chunks; chunk += 1) {
    await requireScriptedProcessAt(input.agent.processes).play(
      [
        {
          type: 'update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            messageId: 'answer',
            content: { type: 'text', text: `chunk ${chunk} ` },
          },
        },
      ],
      'owned-1',
    );
    await pause(betweenChunks);
  }

  controller.abort();
  completed.resolve();
  await finishSubscription(updates);
  await watching;

  const times = new Set(
    [started, ...streamed].flatMap((update): number[] =>
      update.type === 'changed' ? [update.session.activityAt] : [],
    ),
  );

  expect([...times]).toHaveLength(1);
});

async function collect(
  updates: AsyncIterable<SessionListUpdate>,
  into: SessionListUpdate[],
): Promise<void> {
  try {
    for await (const update of updates) into.push(update);
  } catch {
    // The subscription ends with the test.
  }
}
