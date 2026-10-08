import type { AgentInfo, SessionInfo, SessionNewInput } from '@repo/contracts';
import type {
  AgentCommand,
  AgentConfigValue,
  AgentEvent,
} from './agent-events';

export type AgentCommandOf<Type extends AgentCommand['type']> = Extract<
  AgentCommand,
  { type: Type }
>;

export type AgentReady = Omit<
  Extract<AgentEvent, { type: 'agent.ready' }>,
  'type'
>;

export interface AgentConnectInput extends Pick<
  SessionInfo,
  'sessionId' | 'cwd'
> {
  vendorSessionId: string | null;
  configOptions: AgentConfigValue[];
}

// How a vendor session reports to the Agent machine; vendor messages go through `toAgentEvents`.
// A vendor session may report before `connect` resolves; the Agent machine holds those events until ready.
export interface VendorSessionListener<Message> {
  message(message: Message): void;
  event(event: AgentEvent): void;
  failed(error: unknown): void;
}

export type VendorCommand = Exclude<AgentCommand, { type: 'agent.stop' }>;

export class UnsupportedCommandError extends Error {
  constructor(command: VendorCommand) {
    super(`The Agent does not support ${command.type}.`);
    this.name = 'UnsupportedCommandError';
  }
}

// One live vendor session. Ordinary commands run in order; cancel and stop can interrupt them.
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

// What `agents.list` shows for an Agent before any Session starts.
export type AgentProbe = Pick<
  AgentInfo,
  'availability' | 'installStep' | 'configOptions'
>;

// An Agent adapter is plain functions; the one Agent machine owns the lifecycle.
export interface AgentAdapter<Message = unknown, MappingState = unknown> {
  agent: SessionNewInput['agent'];
  label: AgentInfo['label'];
  // SVG text, so no screen names a vendor.
  logo: AgentInfo['logo'];
  // Starts the Agent briefly to learn whether it can run a Session, and the options a New Session offers; rejects when it does not start.
  probe(signal: AbortSignal): Promise<AgentProbe>;
  // Starts or resumes the vendor session, and resolves when it is ready for a prompt.
  connect(
    input: AgentConnectInput,
    listener: VendorSessionListener<Message>,
    // Aborts startup and pending commands when the Agent machine stops.
    signal: AbortSignal,
  ): Promise<VendorSession>;
  initialMappingState(): MappingState;
  // Pure, so recordings can drive it (ADR-0006).
  toAgentEvents(
    message: Message,
    mappingState: MappingState,
  ): AgentMapping<MappingState>;
}
