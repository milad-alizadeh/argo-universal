import type {
  CancelNotification,
  CloseSessionRequest,
  PromptRequest,
  ResumeSessionRequest,
} from '@agentclientprotocol/sdk';
import type { ScriptedResponse } from '@repo/mocks/agent/scripted-responses';
import { startAcpEngine } from './acp-engine';

type IgnoredCancelOptions = {
  close?: Omit<ScriptedResponse<'session/close'>, 'requests'>;
  resume?: Omit<ScriptedResponse<'session/resume'>, 'requests'>;
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
