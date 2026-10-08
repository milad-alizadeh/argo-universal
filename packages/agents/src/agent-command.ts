import type {
  PendingPermission,
  PermissionOption,
  PlanMarkdown,
  SessionInfo,
  SessionPromptInput,
  SessionSetConfigOptionInput,
  Turn,
} from '@repo/contracts';
import type { AgentShell } from './agent-shell';

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
