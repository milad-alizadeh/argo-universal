import type { VendorRequest } from '../../../packages/agents/codex/messages.ts';
import {
  isCommandResponse,
  isFileResponse,
  isQuestionResponse,
  isTurnStartInput,
} from '../../../packages/agents/codex/payloads.ts';
import type { ToolRequestUserInputResponse } from '../../../packages/agents/codex/protocol.gen.ts';
import { isWireFrame } from '../../../packages/agents/codex/wire-payloads.ts';
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
  return permissionAnswer(result, request.method);
}

const permissionOptions = {
  accept: 'allow_once',
  decline: 'reject_once',
  cancel: null,
} as const;
type PermissionDecision = keyof typeof permissionOptions;

function permissionAnswer(
  result: unknown,
  method: VendorRequest['method'],
): RecordedRequestAnswer {
  const accepts =
    method === 'item/fileChange/requestApproval'
      ? isFileResponse
      : isCommandResponse;
  if (!accepts(result)) return rejectRequestAnswer('codex');
  if (!isPermissionDecision(result.decision))
    return rejectRequestAnswer('codex');
  return { type: 'permission', optionId: permissionOptions[result.decision] };
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
  if (!isQuestionResponse(result)) return rejectRequestAnswer('codex');
  return answeredElicitation(result);
}

function isInterrupted(result: unknown): boolean {
  return isWireFrame(result) && result.method === 'turn/interrupt';
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

export function toPlanProposalAnswer(
  turnStart: unknown,
): RecordedRequestAnswer {
  if (!isTurnStartInput(turnStart)) return rejectRequestAnswer('codex');
  if (turnStart.collaborationMode?.mode === 'default')
    return { type: 'plan', decision: 'approve' };
  return {
    type: 'plan',
    decision: 'keep_planning',
    feedback: turnStart.input
      .map((block): string => (block.type === 'text' ? block.text : ''))
      .join('\n'),
  };
}
