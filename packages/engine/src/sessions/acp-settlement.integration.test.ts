import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import { openDatabase } from '@repo/db';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import {
  closeStream,
  isTurnComplete,
  readThrough,
} from '#mocks/feed-stream-reading';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { recoverAfterRestart } from './recovery';

const toolUpdates: SessionNotification['update'][] = [
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'waiting',
    status: 'pending',
  },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'running',
    status: 'in_progress',
  },
  {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'done',
    status: 'completed',
  },
  { sessionUpdate: 'tool_call_update', toolCallId: 'broken', status: 'failed' },
];

const expectedTools = [
  { toolCallId: 'waiting', status: 'cancelled', state: 'settled' },
  { toolCallId: 'running', status: 'cancelled', state: 'settled' },
  { toolCallId: 'done', status: 'completed', state: 'settled' },
  { toolCallId: 'broken', status: 'failed', state: 'settled' },
];

type Ending = 'completion' | 'cancel' | 'agent_crash';

const endingSteps = (ending: Ending): ScriptedStep[] =>
  ending === 'completion'
    ? []
    : [{ type: ending === 'cancel' ? 'wait-for-cancel' : 'hold' }];

const finishTurn = async (
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  sessionId: string,
  ending: Ending,
): Promise<void> => {
  if (ending === 'completion') return;
  await expect
    .poll(
      async () =>
        (await host.caller.feed.page({ sessionId, direction: 'tail' })).rows
          .length,
    )
    .toBe(5);

  await (ending === 'cancel'
    ? host.caller.session.cancel({ sessionId })
    : requireScriptedProcessAt(host.agent.processes).play(
        [{ type: 'exit', code: 17, stderr: 'Agent fixture failed' }],
        'owned-1',
      ));
};

describe.each(appFixtureAgentIds)('%s Turn settlement', (agent) => {
  it.each([
    {
      ending: 'completion' as const,
      stopReason: 'max_tokens' as const,
      errorCode: null,
      notices: [],
    },
    {
      ending: 'cancel' as const,
      stopReason: 'cancelled' as const,
      errorCode: null,
      notices: [],
    },
    {
      ending: 'agent_crash' as const,
      stopReason: 'error' as const,
      errorCode: 'interrupted',
      notices: [
        {
          title: 'Agent exited with status 17',
          description: 'Agent fixture failed',
        },
        {
          title: 'Output may be missing',
          description:
            'The Turn was interrupted, so its output may be missing. Argo did not resend the prompt.',
        },
      ],
    },
  ])(
    '$ending stores and patches unfinished Tool calls as cancelled, keeping finished results and the Stop reason',
    async ({ ending, stopReason, errorCode, notices }) => {
      const host = await startAcpEngine(
        {
          steps: [],
          responses: {
            'session/prompt': [
              {
                steps: [
                  ...toolUpdates.map((update): ScriptedStep => ({
                    type: 'update',
                    update,
                  })),
                  ...endingSteps(ending),
                ],
                result: {
                  stopReason:
                    ending === 'completion' ? 'max_tokens' : 'cancelled',
                },
              },
            ],
          },
        },
        undefined,
        agent,
      );

      const created = await host.caller.session.new({
        ...emptySessionInput,
        agent,
      });

      const stream = (
        await host.caller.feed.subscribe({ ...created, after: null })
      )[Symbol.asyncIterator]();

      await stream.next();
      await host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Work' }],
      });
      await finishTurn(host, created.sessionId, ending);
      const events = await readThrough(stream, isTurnComplete);

      const page = await host.caller.feed.page({
        ...created,
        direction: 'tail',
      });

      expect(
        page.rows.filter((row) => row.sessionUpdate === 'tool_call_update'),
      ).toMatchObject(expectedTools);
      expect(
        events
          .filter((event) => event.type === 'row.patch')
          .map((event) => event.set),
      ).toEqual([
        { state: 'settled', status: 'cancelled' },
        { state: 'settled', status: 'cancelled' },
      ]);
      await expect
        .poll(() =>
          host.database.$client
            .prepare(
              "SELECT status, stop_reason, json_extract(error, '$.code') AS errorCode FROM turn WHERE session_id = ?",
            )
            .get(created.sessionId),
        )
        .toEqual({
          status: 'ended',
          stop_reason: stopReason,
          errorCode,
        });
      expect(
        page.rows.filter(
          (row) => row.sessionUpdate === 'notice' && !row._meta?.argo?.turnEnd,
        ),
      ).toMatchObject(notices);
      const marker = page.rows.at(-1);
      expect(marker).toMatchObject({
        sessionUpdate: 'notice',
        state: 'settled',
        _meta: {
          argo: {
            turnEnd: {
              stopReason,
              durationMs: expect.any(Number),
              error: errorCode ? { code: errorCode } : null,
            },
          },
        },
      });

      const duration = host.database.$client
        .prepare(
          'SELECT ended_at - started_at AS durationMs FROM turn WHERE session_id = ?',
        )
        .get(created.sessionId);

      expect(duration).toEqual({ durationMs: expect.any(Number) });
      expect(marker).toMatchObject({ _meta: { argo: { turnEnd: duration } } });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'row.upsert',
          row: marker,
        }),
      );
      await closeStream(stream);
    },
  );
});

it('commits the Turn ending with its Feed marker and preserves it through restart', async () => {
  const done = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          steps: [{ type: 'gate', waitFor: done.promise, entered }],
          result: { stopReason: 'refusal' },
        },
      ],
    },
  });

  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Work' }],
  });
  await entered.promise;
  await expect.poll(() => host.databaseWriter.getSnapshot().value).toBe('idle');

  const directory = mkdtempSync(join(tmpdir(), 'argo-turn-ending-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const snapshotPath = join(directory, 'snapshot.db');

  const readEnding = `
    SELECT t.status, t.stop_reason, t.ended_at,
      json_extract(f.payload, '$._meta.argo.turnEnd') AS marker
    FROM turn t LEFT JOIN feed_row f ON f.id=t.id || ':end' AND f.session_id=t.session_id
    WHERE t.session_id=?`;

  const endings: unknown[] = [];
  let copied = false;

  const observer = host.databaseWriter.on('writer.committed', () => {
    const ending = host.database.$client
      .prepare(readEnding)
      .get(created.sessionId);

    endings.push(ending);

    if (ending?.marker && !copied) {
      host.database.$client.prepare('VACUUM INTO ?').run(snapshotPath);
      copied = true;
    }
  });

  onTestFinished(() => observer.unsubscribe());
  done.resolve();
  await waitForAcpSessionIdle(host, created.sessionId);
  await expect.poll(() => host.databaseWriter.getSnapshot().value).toBe('idle');
  observer.unsubscribe();

  expect(copied).toBe(true);
  const restarted = openDatabase(snapshotPath);

  try {
    const before = restarted.$client.prepare(readEnding).get(created.sessionId);
    recoverAfterRestart(restarted);
    expect(
      restarted.$client.prepare(readEnding).get(created.sessionId),
    ).toEqual(before);

    for (const ending of endings)
      expect(ending).toMatchObject({
        status: 'ended',
        stop_reason: 'refusal',
        marker: expect.any(String),
      });
  } finally {
    restarted.$client.close();
  }
});
