import type { ToolCallContent, ToolKind } from '@repo/contracts';
import {
  ContentBlock,
  DiffChange,
  ToolCallLocation,
  ToolCallTerminal,
  ToolCallUpdate,
} from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import { dictionary } from './dictionary';
import type { SDKAssistantMessage, SDKUserMessage } from './messages';
export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

type ToolUseBlock = Extract<
  SDKAssistantMessage['message']['content'][number],
  { type: 'tool_use' }
>;
export type ToolResultBlock = Extract<
  Exclude<SDKUserMessage['message']['content'], string>[number],
  { type: 'tool_result' }
>;

type ToolShape = Pick<ToolCallRow, 'title' | 'kind' | 'content' | 'locations'>;

// How each built-in tool reads; any other tool shows as `other`.
const toolShapes: Record<string, (input: unknown) => ToolShape> = {
  Write: (input): ToolShape => {
    const fields = dictionary(input);
    const location = ToolCallLocation.parse({ path: fields.file_path });
    const change = DiffChange.parse({
      operation: 'add',
      path: location.path,
      newText: fields.content,
    });
    const { path } = location;
    return {
      title: `Write ${path}`,
      kind: 'edit',
      locations: [location],
      content: [{ type: 'diff', changes: [change] }],
    };
  },
  Edit: (input): ToolShape => {
    const fields = dictionary(input);
    const change = DiffChange.parse({
      operation: 'modify',
      path: fields.file_path,
      oldText: fields.old_string,
      newText: fields.new_string,
    });
    const { path } = change;
    return {
      title: `Edit ${path}`,
      kind: 'edit',
      locations: [{ path }],
      content: [{ type: 'diff', changes: [change] }],
    };
  },
  Read: (input): ToolShape => {
    const fields = dictionary(input);
    const location = ToolCallLocation.parse({
      path: fields.file_path,
      line: fields.offset,
    });
    const { path } = location;
    return {
      title: `Read ${path}`,
      kind: 'read',
      locations: [location],
      content: [],
    };
  },
  Bash: (input): ToolShape => {
    const fields = dictionary(input);
    const terminal = ToolCallTerminal.parse({
      type: 'terminal',
      command: fields.command,
      output: '',
    });
    const title = ToolCallUpdate.shape.title.parse(
      fields.description ?? terminal.command,
    );
    return {
      title,
      kind: 'execute',
      content: [terminal],
    };
  },
  Grep: (input): ToolShape =>
    search('Grep', ToolCallUpdate.shape.title.parse(dictionary(input).pattern)),
  Glob: (input): ToolShape =>
    search('Glob', ToolCallUpdate.shape.title.parse(dictionary(input).pattern)),
  WebFetch: (input): ToolShape => ({
    title: `Fetch ${ToolCallUpdate.shape.title.parse(dictionary(input).url)}`,
    kind: 'fetch',
    content: [],
  }),
  WebSearch: (input): ToolShape => ({
    title: `Search ${ToolCallUpdate.shape.title.parse(dictionary(input).query)}`,
    kind: 'fetch',
    content: [],
  }),
  ExitPlanMode: (): ToolShape => ({
    title: 'Leave plan mode',
    kind: 'switch_mode',
    content: [],
  }),
};

const search = (name: string, pattern: string): ToolShape => ({
  title: `${name} ${pattern}`,
  kind: 'search',
  content: [],
});

// The open row for a Tool call the model asked for.
export function toolCallStarted(
  block: ToolUseBlock,
  timestamp?: number,
): ToolCallRow {
  const shape = ownToolShape(block) ?? {
    title: block.name,
    kind: 'other' satisfies ToolKind,
    content: [],
  };
  const description =
    block.name === 'Bash'
      ? ToolCallUpdate.shape._meta
          .unwrap()
          .shape.argo.unwrap()
          .shape.description.parse(dictionary(block.input).description)
      : undefined;
  return {
    id: block.id,
    sessionUpdate: 'tool_call_update',
    state: 'open',
    toolCallId: block.id,
    name: block.name,
    status: 'in_progress',
    rawInput: block.input,
    ...shape,
    ...(timestamp === undefined && !description?.trim()
      ? {}
      : {
          _meta: {
            argo: {
              ...(timestamp === undefined ? {} : { startedAt: timestamp }),
              ...(description?.trim() ? { description } : {}),
            },
          },
        }),
  };
}

function resultText(result: ToolResultBlock): string {
  if (typeof result.content === 'string') return result.content;
  return (result.content ?? [])
    .flatMap((block): string[] => (block.type === 'text' ? [block.text] : []))
    .join('\n');
}

function userRejected(message: SDKUserMessage, toolCallId: string): boolean {
  if (!('tool_result_meta' in message)) return false;
  const entries = message.tool_result_meta;
  if (!Array.isArray(entries)) return false;
  return entries.some((entry: unknown): boolean => {
    const fields = dictionary(entry);
    return (
      fields.id === toolCallId && fields.non_execution_kind === 'user-rejected'
    );
  });
}

// What the Write tool found at the path before it wrote; null for a new file.
function overwrittenText(
  row: ToolCallRow,
  message: SDKUserMessage,
): string | null {
  if (row.name !== 'Write') return null;
  const output = message.tool_use_result;
  if (output === undefined) return null;
  return DiffChange.shape.oldText
    .unwrap()
    .nullable()
    .parse(dictionary(output).originalFile);
}

const settled = (
  row: ToolCallRow,
  status: ToolCallRow['status'],
  content: ToolCallContent[],
): ToolCallRow => ({ ...row, state: 'settled', status, content });

// The settled row for a Tool call once its result arrives.
export function toolCallEnded(
  startedRow: ToolCallRow,
  result: ToolResultBlock,
  message: SDKUserMessage & { receivedAt?: number },
): ToolCallRow {
  const endedAt =
    message.timestamp === undefined
      ? message.receivedAt
      : Date.parse(message.timestamp);
  const row: ToolCallRow =
    endedAt === undefined
      ? startedRow
      : {
          ...startedRow,
          _meta: {
            argo: { ...startedRow._meta?.argo, endedAt },
          },
        };
  const rejected = userRejected(message, result.tool_use_id);
  const output = rejected ? '' : resultText(result);
  const oldText = overwrittenText(row, message);

  const content = row.content.map((block): ToolCallContent => {
    if (block.type === 'terminal') return { ...block, output };
    if (block.type !== 'diff' || oldText === null) return block;
    const changes = block.changes.map((change): DiffChange => ({
      ...change,
      operation: 'modify' as const,
      oldText,
    }));
    return { ...block, changes };
  });

  if (rejected) return settled(row, 'cancelled', content);
  if (!result.is_error) {
    if (row.kind === 'read' || row.kind === 'search') {
      const read = message.tool_use_result;
      const text =
        row.kind === 'read' &&
        read !== undefined &&
        dictionary(read).type === 'text'
          ? ContentBlock.options[0].shape.text.parse(
              dictionary(dictionary(read).file).content,
            )
          : output;
      content.push({ type: 'content', content: { type: 'text', text } });
    }
    return settled(row, 'completed', content);
  }
  // A failed call shows its error, unless a terminal already shows the output.
  if (content.some((block): boolean => block.type === 'terminal'))
    return settled(row, 'failed', content);
  const error: ToolCallContent = {
    type: 'content',
    content: { type: 'text', text: output },
  };
  return settled(row, 'failed', [...content, error]);
}

function ownToolShape(block: ToolUseBlock): ToolShape | undefined {
  if (!Object.hasOwn(toolShapes, block.name)) return undefined;
  return toolShapes[block.name]?.(block.input);
}
