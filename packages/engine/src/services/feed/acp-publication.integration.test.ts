import type { FeedSubscribeOutput } from '@repo/contracts';
import { feedScenario } from '@repo/mocks/agent/feed-scenarios';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

const upsertEvent = 'row.upsert';

it('all wire-earlier content precedes idle and text appends keep the actual block index and UTF-16 offset', async () => {
  const host = await startAcpEngine(
    feedScenario([
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: '🙂' },
      },
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: ' first' },
      },
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'resource_link', name: 'File', uri: 'file:///file' },
      },
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: '🙂' },
      },
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: ' last' },
      },
      {
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tool',
        title: 'Finished tool',
        status: 'completed',
      },
      {
        sessionUpdate: 'plan_update',
        plan: { type: 'file', planId: 'plan', uri: 'file:///plan.md' },
      },
      { sessionUpdate: 'notice', severity: 'info', title: 'Notice' },
      {
        sessionUpdate: 'compaction_update',
        compactionId: 'compact',
        status: 'completed',
      },
    ]),
  );
  const created = await host.caller.session.new(emptySessionInput);
  const stream = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  await stream.next();
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Run' }],
  });
  const events: FeedSubscribeOutput[] = [];
  while (true) {
    const next = await stream.next();
    if (next.done) throw new Error('Feed closed before idle');
    events.push(next.value);
    if (
      next.value.type === 'snapshot' &&
      next.value.snapshot.activeTurnId === null
    )
      break;
  }
  expect(events.filter((event) => event.type === 'row.append')).toMatchObject([
    { field: 'content.0.text', off: 2, text: ' first' },
    { field: 'content.2.text', off: 2, text: ' last' },
  ]);
  expect(
    events
      .slice(0, -1)
      .filter((event) => event.type === upsertEvent)
      .map((event) => event.row.sessionUpdate),
  ).toEqual([
    'user_message',
    'agent_message',
    'tool_call_update',
    'plan_update',
    'notice',
    'compaction_update',
  ]);
  expect(
    (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
  ).toHaveLength(6);
  await stream.return?.();
});

it('owned unsolicited updates remain visible with a null Turn while idle', async () => {
  const host = await startAcpEngine();
  const created = await host.caller.session.new(emptySessionInput);
  const stream = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();
  await stream.next();
  const process = host.agent.processes[0];
  if (!process) throw new Error('Process is missing');
  await process.play(
    feedScenario([
      {
        sessionUpdate: 'notice',
        severity: 'info',
        title: 'Idle advisory',
      },
    ]).steps,
    'owned-1',
  );
  let output = await stream.next();
  while (!output.done && output.value.type !== upsertEvent)
    output = await stream.next();
  expect(output.value).toMatchObject({
    type: upsertEvent,
    row: {
      sessionUpdate: 'notice',
      title: 'Idle advisory',
      turnId: null,
      position: 0,
    },
  });
  expect(
    (await host.caller.feed.page({ ...created, direction: 'tail' })).rows[0]
      ?.turnId,
  ).toBeNull();
  await stream.return?.();
});
