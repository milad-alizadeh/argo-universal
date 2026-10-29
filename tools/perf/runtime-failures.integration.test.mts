import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import { z } from 'zod';
import bundleEngine from '../../e2e/engine-bundle.ts';
import { requests } from '../../e2e/steps/agent-requests.ts';
import { persistFixtureTrial } from './runtime-report.test.mocks.mts';
import { runtimeTestHost } from './runtime-test-host.test.mocks.mts';
import { observeRuntimeTurn } from './runtime-trial.mts';

beforeAll(bundleEngine);

const actualOutput = 'Greeting check passed';

const expectedOutput = 'FIRST_LINE\nGreeting check passed';

it('retains an output mismatch as a failed sample even when the Tool and Turn succeed', async () => {
  const host = await runtimeTestHost('feed-work', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Print both expected lines',
    toolMarker: 'greeting.txt',
    expectedStdout: expectedOutput,
    timeoutMs: 10_000,
  });

  expect(trial).toMatchObject({
    status: 'failed',
    turn: { stopReason: 'end_turn' },
    stdout: {
      expected: expectedOutput,
      final: actualOutput,
    },
    error: { message: expect.stringContaining('complete expected stdout') },
  });
  expect(trial.wire.some((event) => event.output === actualOutput)).toBe(true);
  expect(trial.measurements.turnMs).toEqual(expect.any(Number));
  await persistFixtureTrial(host, trial);

  const saved = z
    .object({
      summary: z.array(
        z.object({
          attempted: z.number(),
          failed: z.number(),
          completed: z.number(),
        }),
      ),
      samples: z.array(
        z.object({
          trial: z.object({
            status: z.string(),
            stdout: z.object({ final: z.string(), matches: z.boolean() }),
          }),
        }),
      ),
    })
    .parse(JSON.parse(await readFile(host.reportPath, 'utf8')));

  expect(saved).toMatchObject({
    summary: [{ attempted: 1, failed: 1, completed: 0 }],
    samples: [
      {
        trial: {
          status: 'failed',
          stdout: { final: actualOutput, matches: false },
        },
      },
    ],
  });
});

it('retains a timeout with missing phases and cancels only its own still-active work during cleanup', async () => {
  const host = await runtimeTestHost('held-mode', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Wait without producing a response',
    timeoutMs: 200,
  });

  expect(trial).toMatchObject({
    status: 'timed-out',
    measurements: { firstAgentContentMs: null, turnMs: null },
    cleanup: { status: 'cancelled' },
    error: { phase: 'observe' },
  });

  const snapshot = await host.caller.query('session.get', {
    sessionId: host.target.sessionId,
  });

  expect(snapshot).toMatchObject({ activeTurnId: null });
  expect(requests(host.requestLogPath, 'session/cancel')).toHaveLength(1);
});

it('refuses to credit cancellation when the matching Tool has already completed before its output trigger', async () => {
  const host = await runtimeTestHost('completed-tool-held-turn', false);

  const trial = await observeRuntimeTurn(host.target, {
    id: randomUUID(),
    prompt: 'Run greeting check',
    toolMarker: 'greeting.txt',
    expectedStdout: actualOutput,
    cancelAfterStdout: actualOutput,
    timeoutMs: 10_000,
  });

  expect(trial.status).toBe('failed');
  expect(trial.error?.message).toContain('Tool already terminal');
  expect(trial.measurements.cancelAcknowledgementMs).toBeNull();
  expect(trial.cleanup).toMatchObject({ status: 'cancelled' });
  expect(requests(host.requestLogPath, 'session/cancel')).toHaveLength(1);
});
