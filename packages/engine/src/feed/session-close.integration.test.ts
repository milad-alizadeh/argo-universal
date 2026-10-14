import type { FeedSubscribeOutput } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  upsertRowEvent,
  lastRowId,
  waitForCancelStep,
} from '#mocks/feed-inputs';
import { drainClosedFeed } from '#mocks/feed-observations';
import { readThrough, isNextMessage } from '#mocks/feed-stream-reading';
import {
  database,
  runtimeDirectory,
  feedTestHost,
  controller,
  scriptedAgent,
  setFeedTestHost,
  setScriptedAgent,
} from '#mocks/feed-suite';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { scriptedEngineInput } from '#mocks/scripted-engine';

it('ends a closed Session Feed after draining its last rows', async (): Promise<void> => {
  vi.useRealTimers();

  const input = scriptedEngineInput({
    steps: [{ type: waitForCancelStep }],
    sessionIds: ['vendor-1'],
  });

  setScriptedAgent(input.agent);
  setFeedTestHost(
    await startEngineTestHost({
      database,
      runtimeDirectory,
      ...input,
    }),
  );
  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Start a Turn' }],
  });

  const updates = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: 5 },
      })
  )[Symbol.asyncIterator]();

  const first = await updates.next();
  expect(first.done).toBe(false);
  const process = requireScriptedProcessAt(scriptedAgent.processes);
  await process.play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: lastRowId,
        content: { type: 'text', text: 'Last message' },
      },
    ]).steps,
    'vendor-1',
  );
  const closing = feedTestHost.caller.session.close({ sessionId: 'session-1' });
  const events = await drainClosedFeed(updates);
  expect(events.at(-1)).toEqual({ type: 'closed', failure: null });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ messageId: lastRowId }),
    }),
  );
  await closing;

  const heldRevision = Math.max(
    5,
    ...events.flatMap((event): number[] => ('rev' in event ? [event.rev] : [])),
  );

  await feedTestHost.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue the Session' }],
  });

  const resumed = (
    await feedTestHost
      .createCaller({ signal: controller.signal })
      .feed.subscribe({
        sessionId: 'session-1',
        after: { epoch: 3, revision: heldRevision },
      })
  )[Symbol.asyncIterator]();

  const resumedFirst = await resumed.next();
  expect(resumedFirst.done).toBe(false);

  if (!resumedFirst.value) throw new Error('No resumed Feed event');
  const nextEvents: FeedSubscribeOutput[] = [resumedFirst.value];
  await requireScriptedProcessAt(scriptedAgent.processes, 1).play(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        messageId: 'next-row',
        content: { type: 'text', text: 'Next message' },
      },
    ]).steps,
    'vendor-1',
  );
  nextEvents.push(...(await readThrough(resumed, isNextMessage)));
  expect(nextEvents).toContainEqual(
    expect.objectContaining({
      type: upsertRowEvent,
      row: expect.objectContaining({ messageId: 'next-row' }),
    }),
  );

  const nextRevisions = nextEvents.flatMap((event): number[] =>
    'rev' in event ? [event.rev] : [],
  );

  expect(nextRevisions.length).toBeGreaterThan(0);
  expect(Math.min(...nextRevisions)).toBeGreaterThan(heldRevision);
});
