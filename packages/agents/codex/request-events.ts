import { permissionOptions, type PermissionOption } from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import {
  toElicitationForm,
  type ElicitationQuestion,
} from '../src/elicitation-form';
import type { VendorMessage } from './messages';

export function toRequestEvents(message: VendorMessage): AgentEvent[] {
  if (message.method === 'item/tool/requestUserInput') {
    const { questions, itemId } = message.params;
    return [
      {
        type: 'agent.elicitationRequested',
        request: {
          mode: 'form',
          message: questions
            .map((question): string => question.question)
            .join('\n'),
          toolCallId: itemId,
          requestedSchema: toElicitationForm(
            questions.map((question): ElicitationQuestion => ({
              id: question.id,
              title: question.header,
              question: question.question,
              options: question.options ?? [],
            })),
          ),
        },
      },
    ];
  }
  if (
    message.method === 'item/commandExecution/requestApproval' ||
    message.method === 'item/fileChange/requestApproval'
  ) {
    return [
      {
        type: 'agent.permissionRequested',
        request: {
          toolCallId: message.params.itemId,
          title:
            message.params.reason ??
            ('command' in message.params ? message.params.command : null) ??
            'Approve file changes',
          options: permissionOptions.map((option): PermissionOption => ({
            ...option,
          })),
        },
      },
    ];
  }
  return [];
}
