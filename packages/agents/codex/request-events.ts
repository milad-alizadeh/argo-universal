import { permissionOptions } from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import { toElicitationRequest } from '../src/elicitation-form';
import type { VendorMessage } from './messages';

export function toRequestEvents(message: VendorMessage): AgentEvent[] {
  if (message.method === 'item/tool/requestUserInput') {
    const { questions, itemId } = message.params;
    return [
      toElicitationRequest(
        itemId,
        questions.map((question) => ({
          id: question.id,
          title: question.header,
          question: question.question,
          options: question.options ?? [],
        })),
      ),
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
          options: permissionOptions.map(
            (
              option,
            ): {
              optionId: 'allow_once' | 'reject_once';
              name: string;
              kind: 'allow_once' | 'reject_once';
            } => ({ ...option }),
          ),
        },
      },
    ];
  }
  return [];
}
