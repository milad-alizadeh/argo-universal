import type { AgentCommandOf } from '@repo/agents';

export type RecordedRequestAnswer =
  | {
      type: 'permission';
      optionId: Exclude<
        AgentCommandOf<'agent.answerPermission'>['optionId'],
        null
      >;
      message?: string;
    }
  | ({ type: 'elicitation' } & Pick<
      AgentCommandOf<'agent.answerElicitation'>,
      'action' | 'content'
    >)
  | ({ type: 'plan' } & (
      | { decision: 'approve'; feedback?: string }
      | { decision: 'keep_planning'; feedback: string }
    ));
