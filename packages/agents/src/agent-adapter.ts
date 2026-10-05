import type { SessionNewInput } from '@repo/contracts';
import type { AgentCommand, AgentEvent, AgentInput } from './agent-events';

type Command<Type extends AgentCommand['type']> = Extract<
  AgentCommand,
  { type: Type }
>;

export type AgentReady = Omit<
  Extract<AgentEvent, { type: 'agent.ready' }>,
  'type'
>;

export type AgentConnectInput = Omit<AgentInput, 'adapter' | 'parent'>;

// How a connection reports to the Agent machine; vendor messages go through `toAgentEvents`.
export interface AgentConnectionListener<Message> {
  message(message: Message): void;
  event(event: AgentEvent): void;
  failed(error: string): void;
}

// One live vendor session. The Agent machine calls one method at a time, in order.
export interface AgentConnection {
  ready: AgentReady;
  prompt(command: Command<'agent.prompt'>): Promise<void>;
  cancel(): Promise<void>;
  setConfigOption(command: Command<'agent.setConfigOption'>): Promise<void>;
  answerPermission?(command: Command<'agent.answerPermission'>): Promise<void>;
  answerElicitation?(
    command: Command<'agent.answerElicitation'>,
  ): Promise<void>;
  answerPlanProposal?(
    command: Command<'agent.answerPlanProposal'>,
  ): Promise<void>;
  rename?(command: Command<'agent.rename'>): Promise<void>;
  stopShell?(command: Command<'agent.stopShell'>): Promise<void>;
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
    listener: AgentConnectionListener<Message>,
  ): Promise<AgentConnection>;
  initialMappingState(): MappingState;
  // Pure, so recordings can drive it (ADR-0006).
  toAgentEvents(
    message: Message,
    mappingState: MappingState,
  ): AgentMapping<MappingState>;
}
