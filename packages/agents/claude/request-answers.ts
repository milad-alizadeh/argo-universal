import type { PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import type { AskUserQuestionInput } from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type { AgentCommandOf } from '../src/agent-adapter';
import { toQuestionAnswers } from '../src/elicitation-form';
import { cancelledRequestReason, type Requests } from './request-tracker';
export function answerPermission(
  requests: Requests,
  command: AgentCommandOf<'agent.answerPermission'>,
): void {
  requests.remove(command.toolCallId)?.resolve(permissionAnswer(command));
}
function permissionAnswer(
  command: AgentCommandOf<'agent.answerPermission'>,
): PermissionResult {
  if (command.optionId === 'allow_once') return { behavior: 'allow' };
  return {
    behavior: 'deny',
    message: denialReason(command),
  };
}
export function answerElicitation(
  requests: Requests,
  command: AgentCommandOf<'agent.answerElicitation'>,
): void {
  const request = requests.head();
  if (!request) return;
  const resolve = requestResolver(requests, request.toolUseId, command.action);
  resolveAnswer(resolve, request.input, command);
  if (command.action === 'cancel') requests.cancel();
}
function elicitationAnswer(
  input: Record<string, unknown>,
  command: AgentCommandOf<'agent.answerElicitation'>,
): PermissionResult {
  if (command.action === 'accept')
    return {
      behavior: 'allow',
      updatedInput: { ...input, answers: questionAnswers(command) },
    };
  return declinedQuestion(command.action);
}
function questionAnswers(
  command: AgentCommandOf<'agent.answerElicitation'>,
): AskUserQuestionInput['answers'] {
  return Object.fromEntries(
    Object.entries(
      toQuestionAnswers(
        command.action === 'accept' ? command.content : undefined,
      ),
    ).map(([id, value]): [string, string] => [id, value.join(', ')]),
  );
}

function denialReason(
  command: AgentCommandOf<'agent.answerPermission'>,
): string {
  return command.optionId === null
    ? cancelledRequestReason
    : (command.message ?? 'Rejected by user');
}

function requestResolver(
  requests: Requests,
  id: string,
  action: AgentCommandOf<'agent.answerElicitation'>['action'],
): ((answer: PermissionResult) => void) | undefined {
  return requests.remove(id, action !== 'cancel')?.resolve;
}

function declinedQuestion(
  action: AgentCommandOf<'agent.answerElicitation'>['action'],
): PermissionResult {
  return {
    behavior: 'deny',
    message:
      action === 'cancel' ? cancelledRequestReason : 'User declined to answer',
    interrupt: action === 'cancel',
  };
}

function resolveAnswer(
  resolve: ((answer: PermissionResult) => void) | undefined,
  input: Record<string, unknown>,
  command: AgentCommandOf<'agent.answerElicitation'>,
): void {
  resolve?.(elicitationAnswer(input, command));
}
