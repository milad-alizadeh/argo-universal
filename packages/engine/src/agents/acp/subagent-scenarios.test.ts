import type { SessionNotification } from '@agentclientprotocol/sdk';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { expect, it, onTestFinished } from 'vitest';
import { createScriptedAgentWire } from '#mocks/scripted-agent';
import { createAgentClient } from './client';

it.each(
  (
    [
      {
        name: 'subagent-foreground',
        prompts: 1,
        states: ['running', 'requires_action', 'running', 'idle'],
      },
      { name: 'subagent-background', prompts: 1, states: ['running'] },
      {
        name: 'subagent-more-work',
        prompts: 2,
        states: [
          'running',
          'requires_action',
          'running',
          'idle',
          'running',
          'idle',
        ],
      },
    ] as const
  ).flatMap((scenario) => [
    { ...scenario, instance: 'first' },
    { ...scenario, instance: 'second' },
  ]),
)(
  'delivers $name independently for the $instance Agent instance',
  async ({ name, prompts, states }): Promise<void> => {
    const peer = createScriptedAgentWire(scenarios[name]);
    const accepted: SessionNotification[] = [];

    const connection = createAgentClient({
      stream: peer.stream,
      acceptSessionUpdate: (notification): undefined => {
        accepted.push(notification);
      },
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    });

    onTestFinished(async (): Promise<void> => {
      connection.close();
      peer.disconnect();
      await connection.closed;
    });

    for (let index = 0; index < prompts; index++)
      await connection.agent.request('session/prompt', {
        sessionId: 'parent',
        prompt: [{ type: 'text', text: 'Review' }],
      });

    expect(
      accepted
        .values()
        .filter(({ update }) => update.sessionUpdate === 'subagent_update')
        .map(({ update }) => update)
        .toArray(),
    ).toEqual(
      states.map((state) => ({
        sessionUpdate: 'subagent_update',
        sessionId: 'subagent-review',
        title: 'Review the change',
        state: { state },
      })),
    );
  },
);
