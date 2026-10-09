import { expect, it } from 'vitest';
import { elicitation, permission } from './mocks/requests';
import { initialMappingState, toAgentEvents } from './to-agent-events';

const state = (turnId: string): ReturnType<typeof initialMappingState> => ({
  ...initialMappingState(),
  vendorTurnId: turnId,
});

it('maps a provider command approval request to Argo permission options', (): void => {
  expect(
    toAgentEvents(permission, state(permission.params.turnId)).events,
  ).toEqual([
    {
      type: 'agent.permissionRequested',
      request: {
        toolCallId: 'exec-47aa717a-33f8-4b74-8f4d-da0ab38091de',
        title:
          'May I write recording-ready to /tmp/argo54-permission-output.txt outside the workspace?',
        options: [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'reject_once', name: 'Deny', kind: 'reject_once' },
        ],
      },
    },
  ]);
});

it('maps provider question choices to the canonical Argo form', (): void => {
  expect(
    toAgentEvents(elicitation, state(elicitation.params.turnId)).events,
  ).toEqual([
    {
      type: 'agent.elicitationRequested',
      request: {
        mode: 'form',
        message: 'Which color do you prefer?',
        toolCallId: 'call_wzMYhqck2UH591kUvjL5md8X',
        requestedSchema: {
          type: 'object',
          required: ['preferred_color'],
          properties: {
            preferred_color: {
              type: 'string',
              title: 'Color',
              description: 'Which color do you prefer?',
              oneOf: [
                { const: 'Blue', title: 'Blue', description: 'Choose blue.' },
                {
                  const: 'Green',
                  title: 'Green',
                  description: 'Choose green.',
                },
              ],
            },
          },
        },
      },
    },
  ]);
});

it('ignores a provider request for a different Turn', (): void => {
  expect(toAgentEvents(permission, state('other-turn')).events).toEqual([]);
});
