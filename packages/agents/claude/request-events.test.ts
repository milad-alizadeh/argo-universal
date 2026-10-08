import { expect, it } from 'vitest';
import { permission, plan, question } from './mocks/requests';
import { initialMappingState, toAgentEvents } from './to-agent-events';

it('maps a provider approval request to Argo permission options', (): void => {
  expect(toAgentEvents(permission, initialMappingState()).events).toEqual([
    {
      type: 'agent.permissionRequested',
      request: {
        toolCallId: 'tool',
        title: 'Bash',
        options: [
          { optionId: 'allow_once', name: 'Allow once', kind: 'allow_once' },
          { optionId: 'reject_once', name: 'Deny', kind: 'reject_once' },
        ],
      },
    },
  ]);
});

it('maps a provider plan proposal to the Feed and proposal event', (): void => {
  expect(toAgentEvents(plan, initialMappingState()).events).toEqual([
    {
      type: 'agent.feed',
      change: {
        type: 'upsert',
        update: {
          id: 'tool:plan',
          sessionUpdate: 'plan_update',
          state: 'settled',
          plan: {
            type: 'markdown',
            planId: 'tool:plan',
            content: 'Ship the change.',
            _meta: {
              argo: { requestId: 'permission', filePath: '/repo/plan.md' },
            },
          },
        },
      },
    },
    {
      type: 'agent.planProposed',
      planId: 'tool:plan',
      content: 'Ship the change.',
    },
  ]);
});

it('maps provider question choices to the canonical Argo form', (): void => {
  expect(toAgentEvents(question, initialMappingState()).events).toEqual([
    {
      type: 'agent.elicitationRequested',
      request: {
        mode: 'form',
        message: 'Choose a color',
        toolCallId: 'tool',
        requestedSchema: {
          type: 'object',
          required: ['Choose a color'],
          properties: {
            'Choose a color': {
              type: 'string',
              title: 'Color',
              description: 'Choose a color',
              oneOf: [
                { const: 'Red', title: 'Red', description: 'A red square' },
                { const: 'Blue', title: 'Blue', description: 'A blue circle' },
              ],
            },
          },
        },
      },
    },
  ]);
});

it('rejects an SDK dictionary that cannot become an Argo plan', (): void => {
  expect(() =>
    toAgentEvents(
      { ...plan, request: { ...plan.request, input: { plan: 17 } } },
      initialMappingState(),
    ),
  ).toThrow(/Invalid input/);
});
