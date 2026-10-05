import type { SessionNewInput } from '@repo/contracts';
import type { AgentCommand, AgentEvent, AgentInput } from './agent-events';

export type AgentCommandOf<Type extends AgentCommand['type']> = Extract<
  AgentCommand,
  { type: Type }
>;

export type AgentReady = Omit<
  Extract<AgentEvent, { type: 'agent.ready' }>,
  'type'
>;

export type AgentConnectInput = Omit<AgentInput, 'adapter' | 'parent'>;

// How a vendor session reports to the Agent machine; vendor messages go through `toAgentEvents`.
// A vendor session may report before `connect` resolves; the Agent machine holds those events until ready.
export interface VendorSessionListener<Message> {
  message(message: Message): void;
  event(event: AgentEvent): void;
  failed(error: unknown): void;
}

export type VendorCommand = Exclude<AgentCommand, { type: 'agent.stop' }>;

// One live vendor session. The Agent machine runs one command at a time, in order.
export interface VendorSession {
  ready: AgentReady;
  run(command: VendorCommand): Promise<void>;
  // Resolves once the vendor session has closed.
  stop(): Promise<void>;
}

export interface AgentMapping<MappingState> {
  events: AgentEvent[];
  mappingState: MappingState;
}

// An Agent adapter is plain functions; the one Agent machine owns the lifecycle.
export interface AgentAdapter<Message = unknown, MappingState = unknown> {
  agent: SessionNewInput['agent'];
  // Starts or resumes the vendor session, and resolves when it is ready for a prompt.
  connect(
    input: AgentConnectInput,
    listener: VendorSessionListener<Message>,
  ): Promise<VendorSession>;
  initialMappingState(): MappingState;
  // Pure, so recordings can drive it (ADR-0006).
  toAgentEvents(
    message: Message,
    mappingState: MappingState,
  ): AgentMapping<MappingState>;
}
