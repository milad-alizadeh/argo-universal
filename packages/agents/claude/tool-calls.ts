import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  BashInput,
  FileEditInput,
  FileReadInput,
  FileReadOutput,
  FileWriteInput,
  FileWriteOutput,
  GlobInput,
  GrepInput,
  WebFetchInput,
  WebSearchInput,
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import type { ToolCallContent, ToolKind } from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';

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

// The CLI marks a Tool call the user refused here; the SDK types do not name the field.
interface ToolResultMeta {
  tool_result_meta?: { id: string; non_execution_kind: string }[];
}

type ToolShape = Pick<ToolCallRow, 'title' | 'kind' | 'content' | 'locations'>;

// How each built-in tool reads; any other tool shows as `other`.
const toolShapes: Record<string, (input: unknown) => ToolShape> = {
  Write: (input) => {
    const { file_path: path, content } = input as FileWriteInput;
    return {
      title: `Write ${path}`,
      kind: 'edit',
      locations: [{ path }],
      content: [
        {
          type: 'diff',
          changes: [{ operation: 'add', path, newText: content }],
        },
      ],
    };
  },
  Edit: (input) => {
    const { file_path: path, old_string, new_string } = input as FileEditInput;
    return {
      title: `Edit ${path}`,
      kind: 'edit',
      locations: [{ path }],
      content: [
        {
          type: 'diff',
          changes: [
            {
              operation: 'modify',
              path,
              oldText: old_string,
              newText: new_string,
            },
          ],
        },
      ],
    };
  },
  Read: (input) => {
    const { file_path: path, offset: line } = input as FileReadInput;
    return {
      title: `Read ${path}`,
      kind: 'read',
      locations: [line === undefined ? { path } : { path, line }],
      content: [],
    };
  },
  Bash: (input) => {
    const { command, description } = input as BashInput;
    return {
      title: description ?? command,
      kind: 'execute',
      content: [{ type: 'terminal', command, output: '' }],
    };
  },
  Grep: (input) => search('Grep', (input as GrepInput).pattern),
  Glob: (input) => search('Glob', (input as GlobInput).pattern),
  WebFetch: (input) => ({
    title: `Fetch ${(input as WebFetchInput).url}`,
    kind: 'fetch',
    content: [],
  }),
  WebSearch: (input) => ({
    title: `Search ${(input as WebSearchInput).query}`,
    kind: 'fetch',
    content: [],
  }),
  ExitPlanMode: () => ({
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
  const shape = toolShapes[block.name]?.(block.input) ?? {
    title: block.name,
    kind: 'other' satisfies ToolKind,
    content: [],
  };
  const description =
    block.name === 'Bash' ? (block.input as BashInput).description : undefined;
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

function resultText(result: ToolResultBlock) {
  if (typeof result.content === 'string') return result.content;
  return (result.content ?? [])
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n');
}

function userRejected(message: SDKUserMessage, toolCallId: string) {
  const meta = (message as ToolResultMeta).tool_result_meta ?? [];
  return meta.some(
    (entry) =>
      entry.id === toolCallId && entry.non_execution_kind === 'user-rejected',
  );
}

// What the Write tool found at the path before it wrote; null for a new file.
function overwrittenText(row: ToolCallRow, message: SDKUserMessage) {
  if (row.name !== 'Write') return null;
  const output = message.tool_use_result as FileWriteOutput | undefined;
  return output?.originalFile ?? null;
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
    const changes = block.changes.map((change) => ({
      ...change,
      operation: 'modify' as const,
      oldText,
    }));
    return { ...block, changes };
  });

  if (rejected) return settled(row, 'cancelled', content);
  if (!result.is_error) {
    if (row.kind === 'read' || row.kind === 'search') {
      const read = message.tool_use_result as FileReadOutput | undefined;
      const text =
        row.kind === 'read' && read?.type === 'text'
          ? read.file.content
          : output;
      content.push({ type: 'content', content: { type: 'text', text } });
    }
    return settled(row, 'completed', content);
  }
  // A failed call shows its error, unless a terminal already shows the output.
  if (content.some((block) => block.type === 'terminal'))
    return settled(row, 'failed', content);
  const error: ToolCallContent = {
    type: 'content',
    content: { type: 'text', text: output },
  };
  return settled(row, 'failed', [...content, error]);
}
