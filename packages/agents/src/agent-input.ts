import type { ActorRef, Snapshot } from 'xstate';
import type { AgentAdapter, AgentConnectInput } from './agent-adapter';
import type { AgentEvent } from './agent-events';

export type AgentParent = ActorRef<Snapshot<unknown>, AgentEvent>;

export interface AgentInput extends AgentConnectInput {
  adapter: AgentAdapter;
  parent: AgentParent;
}

export interface AgentOutput {
  failure: string | null;
}

export type VendorSessionInput = Omit<AgentInput, 'parent'>;
