import { RequestError } from '@agentclientprotocol/sdk';
import type { ScriptedResponse } from '@repo/mocks/agent/scripted-responses';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { connectNotificationApp } from '#mocks/notification-app';

const endings: {
  reason: string;
  response: ScriptedResponse<'session/prompt'>;
}[] = [
  { reason: 'refusal', response: { result: { stopReason: 'refusal' } } },
  { reason: 'max_tokens', response: { result: { stopReason: 'max_tokens' } } },
  { reason: 'auth_required', response: { error: RequestError.authRequired() } },
];

it.each(endings)(
  'notifies once for a committed $reason ending',
  async ({ response }) => {
    const host = await startAcpEngine({
      steps: [],
      responses: { 'session/prompt': [response] },
    });

    const app = connectNotificationApp(host.url);
    await app.ready;
    await app.client.session.prompt.mutate({
      sessionId: 'session-1',
      prompt: [{ type: 'text', text: 'Finish the Turn' }],
    });
    await expect.poll(() => app.notifications).toHaveLength(1);
    expect(app.notifications[0]).toMatchObject({
      sessionId: 'session-1',
      kind: 'turn_ended',
    });
  },
);
