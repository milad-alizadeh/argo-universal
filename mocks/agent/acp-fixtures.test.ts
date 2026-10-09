import { client } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { createAppFixtureProcessLauncher } from './acp-fixtures';

it.each(['first', 'second'])(
  'both Agent identities use the shared official ACP peer: %s',
  async (agentId) => {
    const process = await createAppFixtureProcessLauncher({})({ agentId });
    const notifications: unknown[] = [];
    const connection = client()
      .onNotification('session/update', ({ params: notification }) => {
        notifications.push(notification);
      })
      .connect(process.stream);
    const initialized = await connection.agent.request('initialize', {
      protocolVersion: 1,
      clientCapabilities: {},
    });
    const opened = await connection.agent.request('session/new', {
      cwd: '/checkout',
      mcpServers: [],
    });
    const result = await connection.agent.request('session/prompt', {
      sessionId: opened.sessionId,
      prompt: [{ type: 'text', text: 'Reply' }],
    });
    expect(initialized.agentCapabilities?.promptCapabilities?.image).toBe(true);
    expect(result).toEqual({ stopReason: 'end_turn' });
    expect(notifications).toEqual([
      {
        sessionId: opened.sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: {
            type: 'text',
            text: 'The shared fixture completed this Turn.',
          },
        },
      },
    ]);
    await process.terminate();
    await process.exited;
  },
);
