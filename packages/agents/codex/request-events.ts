import { permissionOptions } from '@repo/contracts';
import type { AgentEvent } from '../src/agent-events';
import { toElicitationRequest } from '../src/elicitation-form';
import type { VendorMessage } from './messages';
import type {
  ToolRequestUserInputQuestion,
  CommandExecutionRequestApprovalParams,
} from './protocol.gen';
import type { PermissionRequest } from './vendor-session-state';
const questionInput = (
  question: ToolRequestUserInputQuestion,
): Parameters<typeof toElicitationRequest>[1][number] => ({
  id: question.id,
  title: question.header,
  question: question.question,
  options: question.options ?? [],
});
const elicitationEvent = (
  message: Extract<VendorMessage, { method: 'item/tool/requestUserInput' }>,
): AgentEvent[] => [
  toElicitationRequest(
    message.params.itemId,
    message.params.questions.map(questionInput),
  ),
];
const permissionCommand = (
  message: PermissionRequest,
): CommandExecutionRequestApprovalParams['command'] =>
  'command' in message.params ? message.params.command : null;
const permissionTitle = (message: PermissionRequest): string =>
  message.params.reason ?? commandTitle(message);
const commandTitle = (message: PermissionRequest): string =>
  permissionCommand(message) ?? 'Approve file changes';
const permissionEvent = (message: PermissionRequest): AgentEvent[] => [
  {
    type: 'agent.permissionRequested',
    request: {
      toolCallId: message.params.itemId,
      title: permissionTitle(message),
      options: permissionOptions.map((option): typeof option => ({
        ...option,
      })),
    },
  },
];
const permissionEvents = (message: VendorMessage): AgentEvent[] =>
  message.method === 'item/commandExecution/requestApproval' ||
  message.method === 'item/fileChange/requestApproval'
    ? permissionEvent(message)
    : [];
export function toRequestEvents(message: VendorMessage): AgentEvent[] {
  return message.method === 'item/tool/requestUserInput'
    ? elicitationEvent(message)
    : permissionEvents(message);
}
