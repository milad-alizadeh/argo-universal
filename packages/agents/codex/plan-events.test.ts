import { expect, it } from 'vitest';
import type { AgentEvent } from '../src/agent-events';
import type { VendorMessage } from './messages';
import { initialMappingState, toAgentEvents } from './to-agent-events';

const planContent = 'Inspect the files.';
const planItem = {
  type: 'plan',
  id: 'plan-1',
  text: planContent,
} as const;
const planNotifications = [
  {
    method: 'item/started',
    params: {
      threadId: 'thread',
      turnId: 'plan-turn',
      startedAtMs: 0,
      item: planItem,
    },
  },
  {
    method: 'item/completed',
    params: {
      threadId: 'thread',
      turnId: 'plan-turn',
      completedAtMs: 1,
      item: planItem,
    },
  },
] satisfies [VendorMessage, VendorMessage];
const proposedPlan: AgentEvent[] = [
  {
    type: 'agent.feed',
    change: {
      type: 'upsert',
      update: {
        id: 'plan-1',
        sessionUpdate: 'plan_update',
        state: 'settled',
        plan: {
          type: 'markdown',
          planId: 'plan-1',
          content: planContent,
        },
      },
    },
  },
  {
    type: 'agent.planProposed',
    planId: 'plan-1',
    content: planContent,
  },
];
it.each([
  { message: planNotifications[0], events: [] },
  { message: planNotifications[1], events: proposedPlan },
])(
  'publishes a Plan proposal only at completion ($message.method)',
  ({ message, events }): void => {
    const mappingState = {
      ...initialMappingState(),
      vendorTurnId: 'plan-turn',
    };
    expect(toAgentEvents(message, mappingState)).toEqual({
      events,
      mappingState,
    });
  },
);
