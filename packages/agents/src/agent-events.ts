import type { FeedChange } from '@repo/contracts';
import type { z } from 'zod';
import { AgentLifecycleEvent } from './agent-lifecycle';
import type { PresentOptional } from './agent-optionals';
import type { AgentShell } from './agent-shell';
import type { AgentSubagent } from './agent-subagent';

export type { FeedChange, FeedUpdate } from '@repo/contracts';
export type { AgentCommand, AgentConfigValue } from './agent-command';
export { AgentCapabilities } from './agent-capabilities';
export { AgentReadyData, AgentReadyEvent } from './agent-lifecycle';
export { AgentShell } from './agent-shell';
export { AgentSubagent } from './agent-subagent';

export type AgentEvent =
  | AcceptedLifecycleEvent<z.infer<typeof AgentLifecycleEvent>>
  | {
      type: 'agent.feed';
      change: FeedChange;
      subagentToolCallId?: AgentSubagent['toolCallId'];
    };

const acceptedEvents = new WeakSet<AgentEvent>();

export function parseAgentEvent(candidate: unknown): AgentEvent {
  const event = AgentLifecycleEvent.parse(candidate);
  if (!isPresentEvent(event)) throw new Error('Expected present event fields');
  acceptedEvents.add(event);
  return event;
}

export function acceptAgentEvent(event: AgentEvent): AgentEvent {
  if (event.type === 'agent.feed') return event;
  if (acceptedEvents.has(event)) return event;
  return rejectInvalidEvent(event);
}

function rejectInvalidEvent(event: AgentEvent): AgentEvent {
  try {
    return parseAgentEvent(event);
  } catch {
    return {
      type: 'agent.messageRejected',
      reason: `Invalid Argo event: ${event.type}`,
    };
  }
}

function isPresentEvent(
  event: z.infer<typeof AgentLifecycleEvent>,
): event is AcceptedLifecycleEvent<typeof event> {
  return Object.values(event).every((value): boolean => value !== undefined);
}

type AcceptedLifecycleEvent<Event> = Event extends { subagent: unknown }
  ? PresentOptional<Omit<Event, 'subagent'>> & { subagent: AgentSubagent }
  : Event extends { shell: unknown }
    ? PresentOptional<Omit<Event, 'shell'>> & { shell: AgentShell }
    : PresentOptional<Event>;
