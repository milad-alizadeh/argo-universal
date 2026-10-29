import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  closeStream,
  isTurnComplete,
  readThrough,
} from '#mocks/feed-stream-reading';
import {
  toolUpdates,
  expectedTools,
  endingSteps,
  finishTurn,
} from './acp-settlement.test.mocks';

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
        page.rows
          .filter((row) => row.sessionUpdate === 'notice')
          .filter((row) => !row._meta?.argo?.turnEnd),
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
