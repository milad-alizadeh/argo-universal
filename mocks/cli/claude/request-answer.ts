import type {
  AskUserQuestionInput,
  PermissionResult,
  SDKControlRequest,
} from '../../../packages/agents/claude/messages.ts';
import {
  rejectRequestAnswer,
  type RecordedRequestAnswer,
} from '../request-answer.ts';

type ToolRequest = Extract<
  SDKControlRequest['request'],
  { subtype: 'can_use_tool' }
>;

export function readPermissionResult(response: unknown): PermissionResult {
  if (!isObject(response)) return rejectRequestAnswer('claude');
  if (response.behavior === 'deny') return deniedPermission(response);
  return allowedPermission(response);
}

function allowedPermission(
  response: Record<string, unknown>,
): PermissionResult {
  if (response.behavior !== 'allow') return rejectRequestAnswer('claude');
  const updatedInput = response.updatedInput;
  if (updatedInput === undefined) return { behavior: 'allow' };
  return { behavior: 'allow', updatedInput: readUpdatedInput(updatedInput) };
}

function readUpdatedInput(input: unknown): Record<string, unknown> {
  if (!isObject(input)) return rejectRequestAnswer('claude');
  return input;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deniedPermission(response: Record<string, unknown>): PermissionResult {
  if (typeof response.message !== 'string')
    return rejectRequestAnswer('claude');
  return {
    behavior: 'deny',
    message: response.message,
    interrupt: readInterrupt(response.interrupt),
  };
}

function readInterrupt(interrupt: unknown): boolean {
  if (interrupt === undefined) return false;
  if (typeof interrupt !== 'boolean') return rejectRequestAnswer('claude');
  return interrupt;
}

export function toRequestAnswer(
  request: ToolRequest,
  response: PermissionResult,
): RecordedRequestAnswer {
  if (request.tool_name === 'ExitPlanMode') return planAnswer(response);
  if (request.tool_name === 'AskUserQuestion')
    return elicitationAnswer(response);
  return permissionAnswer(response);
}

function permissionAnswer(response: PermissionResult): RecordedRequestAnswer {
  return response.behavior === 'allow'
    ? { type: 'permission', optionId: 'allow_once' }
    : {
        type: 'permission',
        optionId: 'reject_once',
        message: response.message,
      };
}

function planAnswer(response: PermissionResult): RecordedRequestAnswer {
  return response.behavior === 'allow'
    ? { type: 'plan', decision: 'approve' }
    : { type: 'plan', decision: 'keep_planning', feedback: response.message };
}

function elicitationAnswer(response: PermissionResult): RecordedRequestAnswer {
  if (response.behavior === 'deny')
    return {
      type: 'elicitation',
      action: response.interrupt ? 'cancel' : 'decline',
    };
  return acceptedElicitation(response);
}

function acceptedElicitation(
  response: Extract<PermissionResult, { behavior: 'allow' }>,
): RecordedRequestAnswer {
  const answers = response.updatedInput?.answers;
  if (!isQuestionAnswers(answers)) return rejectRequestAnswer('claude');
  return { type: 'elicitation', action: 'accept', content: answers };
}

function isQuestionAnswers(
  value: unknown,
): value is NonNullable<AskUserQuestionInput['answers']> {
  return (
    isObject(value) &&
    Object.values(value).every((answer): boolean => typeof answer === 'string')
  );
}
