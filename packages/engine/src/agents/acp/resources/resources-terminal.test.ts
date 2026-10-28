import type { SessionUpdate } from '@agentclientprotocol/sdk';
import { expect, it, onTestFinished } from 'vitest';
import { createResourceOpening } from '#mocks/acp-resource';
import { createScriptedAgentLauncher } from '#mocks/scripted-agent';
import { createAcpResources } from '../index';

it.each([
  {
    exitCode: 0,
    result: { status: 'fulfilled', value: { stopReason: 'end_turn' } },
    replies: 1,
  },
  {
    exitCode: 127,
    result: {
      status: 'rejected',
      reason: {
        data: {
          details:
            'Terminal required-command expected exit 0, got {"exitCode":127}: node unavailable',
        },
      },
    },
    replies: 0,
  },
])(
  'requires the fixture terminal exit code before reporting success: $exitCode',
  async ({ exitCode, result, replies }) => {
    const updates: SessionUpdate[] = [];

    const resources = createAcpResources({
      launchProcess: createScriptedAgentLauncher(() => ({
        steps: [
          {
            type: 'terminal',
            toolCallId: 'required-command',
            request: { command: 'argo' },
            completion: 'wait-for-exit',
            requiredExitCode: 0,
          },
          {
            type: 'update',
            update: {
              sessionUpdate: 'agent_message_chunk',
              content: { type: 'text', text: 'The command succeeded' },
            },
          },
        ],
      })),
    });

    onTestFinished(() => resources.shutdown());

    const lease = await resources.open(
      createResourceOpening({
        update: ({ update }): undefined => {
          updates.push(update);
        },
        failed: () => {},
        requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
        createElicitation: () => ({ action: 'cancel' }),
        terminalRequests: {
          'terminal/create': () => ({ terminalId: 'command' }),
          'terminal/wait_for_exit': () => ({ exitCode }),
          'terminal/output': () => ({
            output: 'node unavailable',
            truncated: false,
            exitStatus: { exitCode },
          }),
          'terminal/release': () => ({}),
          'terminal/kill': () => ({}),
        },
      }),
    );

    const prompt = lease.agent.request('session/prompt', {
      sessionId: lease.sessionId,
      prompt: [{ type: 'text', text: 'Run' }],
    });

    expect(await Promise.allSettled([prompt])).toMatchObject([result]);
    expect(
      updates.filter(
        ({ sessionUpdate }) => sessionUpdate === 'agent_message_chunk',
      ),
    ).toHaveLength(replies);
  },
);
