import type {
  ContentBlock,
  ContextUsage,
  PendingElicitation,
  PendingPermission,
  PermissionOption,
  PlanMarkdown,
  RowAppend,
  RowPatch,
  SessionInfo,
  SessionPromptInput,
  SessionSetConfigOptionInput,
  SessionSetConfigOptionOutput,
  SessionUpdate,
  StopReason,
  SubagentState,
  TerminalExitStatus,
  ToolCallTerminal,
  ToolCallUpdate,
  Turn,
  TurnError,
  TurnUsage,
} from '@repo/contracts';
import type { ActorRef, Snapshot } from 'xstate';
import type { AgentAdapter } from './agent-adapter';

// The Feed supplies these fields when it assigns a change to a Session and Turn.
type FeedEnvelope = 'sessionId' | 'turnId' | 'position' | 'revision';
type WithoutEnvelope<Update> = Update extends SessionUpdate
  ? Omit<Update, FeedEnvelope>
  : never;

export type FeedUpdate = WithoutEnvelope<SessionUpdate>;
export type FeedChange =
  | { type: 'upsert'; update: FeedUpdate }
  | ({ type: 'append' } & Pick<RowAppend, 'id' | 'field' | 'text'>)
  | ({ type: 'patch' } & Pick<RowPatch, 'id' | 'set'>);

export interface AgentCapabilities {
  planApproval: 'continueTurn' | 'startTurn';
  stopShell: boolean;
}

export type AgentConfigValue = Pick<
  SessionSetConfigOptionInput,
  'configId' | 'value'
>;

export type AgentCommand =
  | {
      type: 'agent.prompt';
      turnId: Turn['id'];
      content: SessionPromptInput['prompt'];
    }
  | { type: 'agent.cancel' }
  | {
      type: 'agent.answerPermission';
      toolCallId: PendingPermission['toolCallId'];
      optionId: PermissionOption['optionId'] | null;
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
      planId: PlanMarkdown['planId'];
      decision: 'approve';
      turnId?: Turn['id'];
    }
  | {
      type: 'agent.answerPlanProposal';
      planId: PlanMarkdown['planId'];
      decision: 'keep_planning';
      feedback: string;
      turnId?: Turn['id'];
    }
  | { type: 'agent.rename'; title: NonNullable<SessionInfo['title']> }
  | { type: 'agent.stopShell'; shellId: AgentShell['id'] }
  | { type: 'agent.stop' };

export interface AgentSubagent extends Partial<Pick<SessionInfo, 'title'>> {
  toolCallId: ToolCallUpdate['toolCallId'];
  vendorSessionId: string;
  prompt: ContentBlock[];
  role?: string;
  state: SubagentState;
  turn?: {
    vendorTurnId: string;
    model?: string;
    startedAt: Turn['startedAt'];
    endedAt?: NonNullable<Turn['endedAt']>;
    stopReason?: StopReason;
    usage?: TurnUsage;
    error?: TurnError;
  };
}

export interface AgentShell {
  id: string;
  toolCallId: ToolCallUpdate['toolCallId'];
  command: ToolCallTerminal['command'];
  cwd: SessionInfo['cwd'];
  status: 'running' | 'exited' | 'stopped' | 'lost';
  startedAt: Turn['startedAt'];
  endedAt?: NonNullable<Turn['endedAt']>;
  exitCode?: TerminalExitStatus['exitCode'] | null;
}

export type AgentEvent =
  | {
      type: 'agent.ready';
      vendorSessionId: string;
      configOptions: SessionSetConfigOptionOutput['configOptions'];
      capabilities: AgentCapabilities;
      continuedOutside: boolean;
    }
  | {
      type: 'agent.feed';
      change: FeedChange;
      subagentToolCallId?: AgentSubagent['toolCallId'];
    }
  | { type: 'agent.permissionRequested'; request: PendingPermission }
  | {
      type: 'agent.elicitationRequested';
      request: Omit<PendingElicitation, 'requestId'>;
    }
  | { type: 'agent.usage'; usage: ContextUsage }
  | {
      type: 'agent.configOptionsChanged';
      configOptions: SessionSetConfigOptionOutput['configOptions'];
    }
  | { type: 'agent.turnStarted' }
  | {
      type: 'agent.turnEnded';
      stopReason: StopReason;
      usage?: TurnUsage;
      error?: TurnError;
    }
  | ({ type: 'agent.planProposed' } & Pick<PlanMarkdown, 'planId' | 'content'>)
  | { type: 'agent.titleChanged'; title: NonNullable<SessionInfo['title']> }
  | { type: 'agent.subagentChanged'; subagent: AgentSubagent }
  | { type: 'agent.shellChanged'; shell: AgentShell }
  | { type: 'agent.shellOutput'; shellId: AgentShell['id']; text: string };

export type AgentParent = ActorRef<Snapshot<unknown>, AgentEvent>;

export interface AgentInput extends Pick<SessionInfo, 'sessionId' | 'cwd'> {
  adapter: AgentAdapter;
  vendorSessionId: string | null;
  configOptions: AgentConfigValue[];
  parent: AgentParent;
}

export interface AgentOutput {
  failure: string | null;
}
