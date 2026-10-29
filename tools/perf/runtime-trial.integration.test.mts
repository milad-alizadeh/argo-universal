import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { FeedPageOutput } from '@repo/contracts';
import { beforeAll, expect, it } from 'vitest';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { requests } from '../../e2e/steps/agent-requests.ts';
import { runtimeTestHost } from './runtime-test-host.test.mocks.mts';
import { observeRuntimeTurn } from './runtime-trial.mts';

beforeAll(bundleEngine);

const greetingOutput = 'Greeting check passed';

it('times one new Turn through the public Server wire without treating earlier reply replay as new content', async () => {
  const host = await runtimeTestHost();
  const id = randomUUID();

  const trial = await observeRuntimeTurn(host.target, {
    id,
    prompt: `Runtime timing trial ${id}`,
    expectedReply: 'The shared fixture completed this Turn.',
    timeoutMs: 10_000,
  });

  expect(trial).toMatchObject({
    id,
    status: 'completed',
    reply: 'The shared fixture completed this Turn.',
    turn: {
      sessionId: host.target.sessionId,
      status: 'ended',
      stopReason: 'end_turn',
    },
    measurements: {
      acceptanceMs: expect.any(Number),
      firstAgentContentMs: expect.any(Number),
      turnMs: expect.any(Number),
      finalSentinelMs: expect.any(Number),
    },
  });
  assert(trial.turn);
  expect(trial.turn.id).not.toBe(host.initialTurnId);

  const first = trial.milestones.filter(
    (event) => event.milestone === 'first-agent-content',
  );

  expect(first).toHaveLength(1);
  assert(first[0]);
  expect(first[0]).toMatchObject({
    sessionId: host.target.sessionId,
    turnId: trial.turn.id,
  });

  const page = FeedPageOutput.parse(
    await host.caller.query('feed.page', {
      sessionId: host.target.sessionId,
      direction: 'tail',
    }),
  );

  const firstRowId = first[0].rowId;

  expect(page.rows.find((row) => row.id === firstRowId)).toMatchObject({
    sessionUpdate: 'agent_message',
    sessionId: host.target.sessionId,
    turnId: trial.turn.id,
  });
  expect(requests(host.requestLogPath, 'session/prompt')).toHaveLength(2);
});

it('observes the matching command Tool and its complete output once before the authoritative Turn end', async () => {
  const host = await runtimeTestHost('feed-work', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Run the greeting check',
    toolMarker: 'greeting.txt',
    expectedStdout: greetingOutput,
    timeoutMs: 10_000,
  });

  expect(trial).toMatchObject({
    status: 'completed',
    turn: { stopReason: 'end_turn' },
    stdout: {
      observed: greetingOutput,
      final: greetingOutput,
    },
  });

  assert(trial.turn);

  for (const milestone of [
    'tool-received',
    'first-tool-output',
    'tool-completed',
  ]) {
    const events = trial.milestones.filter(
      (event) => event.milestone === milestone,
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      turnId: trial.turn.id,
      toolCallId: 'greeting-check',
    });
  }

  expect(requests(host.requestLogPath, 'session/prompt')).toHaveLength(1);
});

it('cancels only the observed Turn and records cancellation acknowledgement and terminal state', async () => {
  const host = await runtimeTestHost('held-mode', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Stay active until cancelled',
    cancelWhenAccepted: true,
    timeoutMs: 500,
  });

  expect(trial).toMatchObject({
    status: 'completed',
    turn: { stopReason: 'cancelled' },
  });
  expect(trial.milestones.map((event) => event.milestone)).toEqual(
    expect.arrayContaining([
      'cancel-dispatched',
      'cancel-acknowledged',
      'turn-ended',
    ]),
  );
  expect(trial.measurements.cancelTerminalMs).toEqual(expect.any(Number));
  expect(requests(host.requestLogPath, 'session/cancel')).toHaveLength(1);
});

it('validates the final Agent message independently of earlier commentary in the same Turn', async () => {
  const host = await runtimeTestHost('feed-history', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Reply after the commentary',
    expectedReply: 'Latest history reply.',
    timeoutMs: 10_000,
  });

  expect(trial).toMatchObject({
    status: 'completed',
    reply: 'Latest history reply.',
  });
  expect(trial.wire.some((event) => event.text === 'History message 1.')).toBe(
    true,
  );
  expect(
    trial.milestones.filter(
      (event) => event.milestone === 'first-agent-content',
    ),
  ).toHaveLength(1);
});
