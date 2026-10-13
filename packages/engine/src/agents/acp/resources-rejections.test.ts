import type { SessionNotification } from '@agentclientprotocol/sdk';
import { sharedReply } from '@repo/mocks/agent/scenarios';
import { expect, it, onTestFinished, vi } from 'vitest';
import {
  createResourceDestination,
  createResourceOpening,
} from '#mocks/acp-resource';
import { createScriptedAgentLauncher } from '#mocks/scripted-agent';
import { createAcpResources } from './index';

const strangerUpdate = JSON.stringify({
  jsonrpc: '2.0',
  method: 'session/update',
  params: {
    sessionId: 'not-opened-by-argo',
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: { type: 'text', text: 'Not yours' },
    },
  } satisfies SessionNotification,
});

it('an Agent frame for a Session Argo never opened is rejected, reported and counted while the owned Session keeps its own updates', async () => {
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const resources = createAcpResources({
    launchProcess: createScriptedAgentLauncher(() => ({
      steps: [
        { type: 'raw', frame: strangerUpdate },
        { type: 'raw', frame: strangerUpdate },
        {
          type: 'update',
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: { type: 'text', text: sharedReply },
          },
        },
      ],
    })),
  });
  onTestFinished(() => resources.shutdown());
  const received: SessionNotification[] = [];
  const lease = await resources.open(
    createResourceOpening(createResourceDestination(received)),
  );
  await lease.agent.request('session/prompt', {
    sessionId: lease.sessionId,
    prompt: [{ type: 'text', text: 'Start' }],
  });
  expect({
    received: received.map(({ update }) => update),
    reported: report.mock.calls.map(([line]) => line),
  }).toEqual({
    received: [
      {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: sharedReply },
      },
    ],
    reported: [
      'ACP resources: Unrecognised ACP session update #1',
      'ACP resources: Unrecognised ACP session update #2',
    ],
  });
});
