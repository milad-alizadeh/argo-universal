import {
  acceptsNamedPayload,
  arrayOf,
  hasFields,
  isNumber,
  isRecord,
  isString,
  nullable,
  oneOf,
} from '../src/payload-shape.ts';
import type { MappedThreadItem } from './messages.ts';
import type { ThreadItem } from './protocol.gen';
import { isUserInput } from './request-payloads.ts';

const isTextItem = (value: unknown): boolean =>
  hasFields(value, { text: isString });
const isReasoning = (value: unknown): boolean =>
  hasFields(value, { summary: arrayOf(isString), content: arrayOf(isString) });
const isCommandAction = (
  value: unknown,
): value is Extract<
  ThreadItem,
  { type: 'commandExecution' }
>['commandActions'][number] => {
  if (!hasFields(value, { type: isString, command: isString })) return false;
  return acceptsCommandAction(value);
};
function acceptsCommandAction(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return acceptsNamedPayload(
    commandActionPredicates,
    String(value.type),
    value,
  );
}
const commandActionPredicates: Record<string, (value: unknown) => boolean> = {
  read: (value): boolean =>
    hasFields(value, { name: isString, path: isString }),
  listFiles: (value): boolean => hasFields(value, { path: nullable(isString) }),
  search: (value): boolean =>
    hasFields(value, { path: nullable(isString), query: nullable(isString) }),
  unknown: isRecord,
};
const isCommand = (value: unknown): boolean =>
  hasFields(value, {
    command: isString,
    cwd: isString,
    status: oneOf('inProgress', 'completed', 'failed', 'declined'),
    commandActions: arrayOf(isCommandAction),
    aggregatedOutput: nullable(isString),
    exitCode: nullable(isNumber),
    durationMs: nullable(isNumber),
  });
const isFileChange = (
  value: unknown,
): value is Extract<ThreadItem, { type: 'fileChange' }>['changes'][number] =>
  hasFields(value, {
    path: isString,
    diff: isString,
    kind: (kind): boolean => isPatchKind(kind),
  });
const isFileChanges = (value: unknown): boolean =>
  hasFields(value, {
    changes: arrayOf(isFileChange),
    status: oneOf('inProgress', 'completed', 'failed', 'declined'),
  });
const isUserMessage = (value: unknown): boolean =>
  hasFields(value, { content: arrayOf(isUserInput) });
const isMcpCall = (value: unknown): boolean =>
  hasFields(value, {
    server: isString,
    tool: isString,
    status: oneOf('inProgress', 'completed', 'failed', 'declined'),
  });
const isDynamicCall = (value: unknown): boolean =>
  hasFields(value, {
    tool: isString,
    status: oneOf('inProgress', 'completed', 'failed', 'declined'),
  });
const itemPredicates: Record<string, (value: unknown) => boolean> = {
  userMessage: isUserMessage,
  agentMessage: isTextItem,
  plan: isTextItem,
  reasoning: isReasoning,
  commandExecution: isCommand,
  fileChange: isFileChanges,
  mcpToolCall: isMcpCall,
  dynamicToolCall: isDynamicCall,
  contextCompaction: isRecord,
  collabAgentToolCall: isRecord,
  webSearch: isRecord,
  imageView: isRecord,
  imageGeneration: isRecord,
  enteredReviewMode: isRecord,
  exitedReviewMode: isRecord,
  hookPrompt: isRecord,
  functionCallOutput: isRecord,
  subAgentActivity: isRecord,
  sleep: isRecord,
};
export function isThreadItem(value: unknown): value is MappedThreadItem {
  if (!isRecord(value)) return false;
  if (!hasFields(value, { id: isString, type: isString })) return false;
  return acceptsNamedPayload(itemPredicates, String(value.type), value);
}

function isPatchKind(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.type === 'update') return nullable(isString)(value.move_path);
  return oneOf('add', 'delete')(value.type);
}
