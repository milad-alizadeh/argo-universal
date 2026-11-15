import type {
  RequestPermissionResponse,
  CreateElicitationResponse,
} from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';

it('rejects background questions without surfacing them in the main Session', async () => {
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { steps: [] },
        {
          prompt: 'Return JSON only:',
          steps: [
            {
              type: 'permission',
              request: {
                toolCall: {
                  toolCallId: 'background-tool',
                  title: 'Run command',
                },
                options: [
                  { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
                ],
              },
              responses: permissions,
            },
            {
              type: 'elicitation',
              request: {
                mode: 'form',
                message: 'Choose next step',
                requestedSchema: { type: 'object', properties: {} },
              },
              responses: elicitations,
            },
            {
              type: 'update',
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: {
                  type: 'text',
                  text: '{"suggestion":"Run the tests"}',
                },
              },
            },
          ],
        },
      ],
    },
  });

  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    sessionId,
    prompt: [{ type: 'text', text: 'Fix the test' }],
    followUpSuggestions: true,
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.followUpSuggestion?.text === 'Run the tests',
  );

  expect(permissions).toEqual([{ outcome: { outcome: 'cancelled' } }]);
  expect(elicitations).toEqual([{ action: 'cancel' }]);
  expect(snapshot.pendingPermission).toBeNull();
  expect(snapshot.pendingElicitation).toBeNull();
});
