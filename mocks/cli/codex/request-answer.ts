import type { VendorRequest } from '../../../packages/agents/codex/messages.ts';
import type {
  CommandExecutionRequestApprovalResponse,
  ToolRequestUserInputResponse,
  TurnStartParams,
} from '../../../packages/agents/codex/protocol.gen.ts';
import {
  rejectRequestAnswer,
  type RecordedRequestAnswer,
} from '../request-answer.ts';

export function toRequestAnswer(
  request: Pick<VendorRequest, 'method'>,
  result: unknown,
): RecordedRequestAnswer {
  if (request.method === 'item/tool/requestUserInput')
    return elicitationAnswer(result);
  return permissionAnswer(result);
}

const permissionOptions = {
  accept: 'allow_once',
  decline: 'reject_once',
  cancel: null,
} as const;
type PermissionDecision = keyof typeof permissionOptions;

function permissionAnswer(result: unknown): RecordedRequestAnswer {
  if (!isPermissionResult(result)) return rejectRequestAnswer('codex');
  return { type: 'permission', optionId: permissionOptions[result.decision] };
}

function isPermissionResult(result: unknown): result is {
  decision: Extract<
    CommandExecutionRequestApprovalResponse['decision'],
    PermissionDecision
  >;
} {
  return isObject(result) && isPermissionDecision(result.decision);
}

function isPermissionDecision(
  decision: unknown,
): decision is PermissionDecision {
  return (
    decision === 'accept' || decision === 'decline' || decision === 'cancel'
  );
}

function elicitationAnswer(result: unknown): RecordedRequestAnswer {
  if (isInterrupted(result)) return { type: 'elicitation', action: 'cancel' };
  if (!isQuestionResult(result)) return rejectRequestAnswer('codex');
  return answeredElicitation(result);
}

function isInterrupted(result: unknown): boolean {
  return isObject(result) && result.method === 'turn/interrupt';
}

function answeredElicitation(
  result: ToolRequestUserInputResponse,
): RecordedRequestAnswer {
  if (Object.keys(result.answers).length === 0)
    return { type: 'elicitation', action: 'decline' };
  return {
    type: 'elicitation',
    action: 'accept',
    content: Object.fromEntries(
      Object.entries(result.answers).map(questionAnswer),
    ),
  };
}

function questionAnswer([id, answer]: [
  string,
  ToolRequestUserInputResponse['answers'][string],
]): [string, string | string[]] {
  if (!answer) return rejectRequestAnswer('codex');
  return [id, questionValue(answer.answers)];
}

function questionValue(answers: string[]): string | string[] {
  const [only] = answers;
  return answers.length === 1 && only !== undefined ? only : answers;
}

function isQuestionResult(
  result: unknown,
): result is ToolRequestUserInputResponse {
  return (
    isObject(result) &&
    isObject(result.answers) &&
    Object.values(result.answers).every(isQuestionAnswer)
  );
}

function isQuestionAnswer(answer: unknown): boolean {
  return (
    isObject(answer) &&
    Array.isArray(answer.answers) &&
    answer.answers.every((value: unknown): boolean => typeof value === 'string')
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toPlanProposalAnswer(
  turnStart: unknown,
): RecordedRequestAnswer {
  if (!isObject(turnStart)) return rejectRequestAnswer('codex');
  if (isApprovedTurnStart(turnStart.collaborationMode))
    return { type: 'plan', decision: 'approve' };
  return keptPlanAnswer(turnStart.input);
}

function isApprovedTurnStart(collaboration: unknown): boolean {
  return isObject(collaboration) && collaboration.mode === 'default';
}

function keptPlanAnswer(input: unknown): RecordedRequestAnswer {
  if (!Array.isArray(input)) return rejectRequestAnswer('codex');
  return {
    type: 'plan',
    decision: 'keep_planning',
    feedback: input.map(inputText).join('\n'),
  };
}

function inputText(block: unknown): string {
  if (!isObject(block)) return rejectRequestAnswer('codex');
  return recognizedInputText(block);
}

type PlanInput = TurnStartParams['input'][number];

const inputKinds: Record<PlanInput['type'], true> = {
  text: true,
  image: true,
  localImage: true,
  audio: true,
  localAudio: true,
  skill: true,
  mention: true,
};

function recognizedInputText(block: Record<string, unknown>): string {
  if (!isInputKind(block.type)) return rejectRequestAnswer('codex');
  return block.type === 'text' ? feedbackText(block.text) : '';
}

function isInputKind(kind: unknown): kind is PlanInput['type'] {
  return typeof kind === 'string' && Object.hasOwn(inputKinds, kind);
}

function feedbackText(text: unknown): string {
  if (typeof text !== 'string') return rejectRequestAnswer('codex');
  return text;
}
