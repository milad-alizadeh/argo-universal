import type {
  CancelNotification,
  CloseSessionRequest,
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { FeedPageOutput } from '@repo/contracts';
import type { ScriptedResponse } from '@repo/mocks/agent/scripted-responses';
import { vi } from 'vitest';
import { readCancelTurns } from './acp-cancel-observations';
import { startAcpEngine } from './acp-engine';

type IgnoredCancelOptions = {
  close?: Omit<ScriptedResponse<'session/close'>, 'requests'>;
  resume?: Omit<ScriptedResponse<'session/resume'>, 'requests'>;
  nextPromptGate?: { entered: { resolve: () => void }; waitFor: Promise<void> };
  autoExit?: boolean;
};

type IgnoredCancelEngine = {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  cancels: CancelNotification[];
  closes: CloseSessionRequest[];
  resumes: ResumeSessionRequest[];
  prompts: PromptRequest[];
  cancelled: PromiseWithResolvers<CancelNotification>;
  finishSibling: PromiseWithResolvers<void>;
};

export const startIgnoredCancelEngine = async (
  agentId: string,
  options: IgnoredCancelOptions = {},
): Promise<IgnoredCancelEngine> => {
  const cancels: CancelNotification[] = [];
  const closes: CloseSessionRequest[] = [];
  const resumes: ResumeSessionRequest[] = [];
  const prompts: PromptRequest[] = [];
  const cancelled = Promise.withResolvers<CancelNotification>();
  const finishSibling = Promise.withResolvers<void>();

  const host = await startAcpEngine(
    {
      steps: [],
      autoExit: options.autoExit,
      responses: {
        'session/prompt': [
          {
            sessionId: 'owned-1',
            requests: prompts,
            steps: [
              {
                type: 'update',
                update: {
                  sessionUpdate: 'tool_call',
                  toolCallId: 'unfinished',
                  title: 'Run checks',
                  kind: 'execute',
                  status: 'in_progress',
                },
              },
              { type: 'hold' },
            ],
          },
          {
            sessionId: 'owned-1',
            requests: prompts,
            steps: [
              {
                type: 'update',
                update: {
                  sessionUpdate: 'agent_message_chunk',
                  content: { type: 'text', text: 'Context retained' },
                },
              },
              ...(options.nextPromptGate
                ? [{ type: 'gate' as const, ...options.nextPromptGate }]
                : []),
            ],
            result: { stopReason: 'end_turn' },
          },
          {
            sessionId: 'owned-2',
            requests: prompts,
            steps: [{ type: 'gate', waitFor: finishSibling.promise }],
            result: { stopReason: 'end_turn' },
          },
        ],
        'session/close': [{ ...options.close, requests: closes }],
        'session/resume': [{ ...options.resume, requests: resumes }],
      },
      notifications: {
        'session/cancel': { requests: cancels, received: cancelled },
      },
    },
    undefined,
    agentId,
  );

  return { host, cancels, closes, resumes, prompts, cancelled, finishSibling };
};

export const waitForIgnoredCancelTool = async (
  host: IgnoredCancelEngine['host'],
  sessionId: string,
): Promise<void> => {
  const events = await host.caller.feed.subscribe({ sessionId, after: null });

  for await (const event of events)
    if (
      event.type === 'row.upsert' &&
      event.row.sessionUpdate === 'tool_call_update'
    )
      return;
  throw new Error('The Feed ended before the Tool call');
};

export const observeCancelDeadline = async (
  fixture: IgnoredCancelEngine,
  sessionId: string,
): Promise<{
  before: {
    turns: ReturnType<typeof readCancelTurns>;
    closes: CloseSessionRequest[];
    resumes: ResumeSessionRequest[];
  };
  rows: FeedPageOutput['rows'];
}> => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  try {
    await fixture.host.caller.session.cancel({ sessionId });
    await fixture.cancelled.promise;
    await vi.advanceTimersByTimeAsync(9_999);

    const before = {
      turns: readCancelTurns(fixture.host, sessionId),
      closes: [...fixture.closes],
      resumes: [...fixture.resumes],
    };

    await vi.advanceTimersByTimeAsync(1);

    const page = await fixture.host.caller.feed.page({
      sessionId,
      direction: 'tail',
    });

    return { before, rows: page.rows };
  } finally {
    vi.useRealTimers();
  }
};
