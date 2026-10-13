import type { SessionNotification } from '@agentclientprotocol/sdk';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { describe, expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import {
  closeStream,
  isTurnComplete,
  readThrough,
} from '#mocks/feed-stream-reading';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

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
  if (ending === 'cancel') await host.caller.session.cancel({ sessionId });
  else requireScriptedProcessAt(host.agent.processes).disconnect();
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
        { title: 'The Agent stopped unexpectedly' },
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
        page.rows.filter((row) => row.sessionUpdate === 'notice'),
      ).toMatchObject(notices);
      await closeStream(stream);
    },
  );
});
