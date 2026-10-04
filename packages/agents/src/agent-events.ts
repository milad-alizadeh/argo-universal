import type {
  ContentBlock,
  ContextUsage,
  PendingElicitation,
  PendingPermission,
  RowAppend,
  RowPatch,
  SessionConfigOption,
  SessionUpdate,
  StopReason,
  SubagentState,
  TurnError,
  TurnUsage,
} from '@repo/contracts';
import type {
  ActorRef,
  AnyStateMachine,
  EventFromLogic,
  InputFrom,
  OutputFrom,
  Snapshot,
} from 'xstate';

// The Feed supplies these fields when it assigns a change to a Session and Turn.
type FeedEnvelope = 'sessionId' | 'turnId' | 'position' | 'revision';
type WithoutEnvelope<Update> = Update extends SessionUpdate
  ? Omit<Update, FeedEnvelope>
  : never;

export type FeedUpdate = WithoutEnvelope<SessionUpdate>;
export type FeedChange =
  | { type: 'upsert'; update: FeedUpdate }
  | { type: 'append'; id: string; field: RowAppend['field']; text: string }
  | { type: 'patch'; id: string; set: RowPatch['set'] };

export interface AgentCapabilities {
  planApproval: 'continueTurn' | 'startTurn';
  stopShell: boolean;
}

export interface AgentConfigValue {
  configId: string;
  value: string | boolean;
}

export type AgentCommand =
  | { type: 'agent.prompt'; turnId: string; content: ContentBlock[] }
  | { type: 'agent.cancel' }
  | {
      type: 'agent.answerPermission';
      toolCallId: string;
      optionId: string | null;
      message?: string;
    }
  | {
      type: 'agent.answerElicitation';
      action: 'accept' | 'decline' | 'cancel';
      content?: Record<string, unknown>;
    }
  | ({ type: 'agent.setConfigOption' } & AgentConfigValue)
  | {
      type: 'agent.answerPlanProposal';
      planId: string;
      decision: 'approve';
      turnId?: string;
    }
  | {
      type: 'agent.answerPlanProposal';
      planId: string;
      decision: 'keep_planning';
      feedback: string;
      turnId?: string;
    }
  | { type: 'agent.rename'; title: string }
  | { type: 'agent.stopShell'; shellId: string }
  | { type: 'agent.stop' };

export interface AgentSubagent {
  toolCallId: string;
  vendorSessionId: string;
  prompt: ContentBlock[];
  title?: string;
  role?: string;
  state: SubagentState;
  turn?: {
    vendorTurnId: string;
    model?: string;
    startedAt: number;
    endedAt?: number;
    stopReason?: StopReason;
    usage?: TurnUsage;
    error?: TurnError;
  };
}

export interface AgentShell {
  id: string;
  toolCallId: string;
  command: string;
  cwd: string;
  status: 'running' | 'exited' | 'stopped' | 'lost';
  startedAt: number;
  endedAt?: number;
  exitCode?: number | null;
}

export type AgentEvent =
  | {
      type: 'agent.ready';
      vendorSessionId: string;
      configOptions: SessionConfigOption[];
      capabilities: AgentCapabilities;
      continuedOutside: boolean;
    }
  | { type: 'agent.feed'; change: FeedChange; subagentToolCallId?: string }
  | { type: 'agent.permissionRequested'; request: PendingPermission }
  | { type: 'agent.elicitationRequested'; request: PendingElicitation }
  | { type: 'agent.usage'; usage: ContextUsage }
  | { type: 'agent.configOptionsChanged'; configOptions: SessionConfigOption[] }
  | { type: 'agent.turnStarted' }
  | {
      type: 'agent.turnEnded';
      stopReason: StopReason;
      usage?: TurnUsage;
      error?: TurnError;
    }
  | { type: 'agent.planProposed'; planId: string; content: string }
  | { type: 'agent.titleChanged'; title: string }
  | { type: 'agent.subagentChanged'; subagent: AgentSubagent }
  | { type: 'agent.shellChanged'; shell: AgentShell }
  | { type: 'agent.shellOutput'; shellId: string; text: string };

export type AgentParent = ActorRef<Snapshot<unknown>, AgentEvent>;

export interface AgentInput {
  sessionId: string;
  cwd: string;
  vendorSessionId: string | null;
  configOptions: AgentConfigValue[];
  parent: AgentParent;
}

export interface AgentOutput {
  failure: string | null;
}

export interface AgentAdapter<Machine extends AnyStateMachine> {
  agent: string;
  capabilities: AgentCapabilities;
  machine: AgentCommand extends EventFromLogic<Machine>
    ? AgentInput extends InputFrom<Machine>
      ? OutputFrom<Machine> extends AgentOutput
        ? Machine
        : never
      : never
    : never;
}
