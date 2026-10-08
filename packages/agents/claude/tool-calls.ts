import type { DiffChange, ToolCallContent, ToolKind } from '@repo/contracts';
import type { FeedUpdate } from '../src/agent-events';
import type { MappedContent, MappedUser } from './messages';
import {
  isBashInput,
  isEditInput,
  isGlobInput,
  isGrepInput,
  isReadInput,
  isWebFetchInput,
  isWebSearchInput,
  isWriteInput,
} from './tool-inputs.ts';
import {
  isTextReadResult,
  isToolResultMeta,
  isWriteResult,
} from './tool-results.ts';

export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

type ToolUseBlock = Extract<MappedContent, { type: 'tool_use' }>;
export type ToolResultBlock = Extract<MappedContent, { type: 'tool_result' }>;

type ToolShape = Pick<ToolCallRow, 'title' | 'kind' | 'content' | 'locations'>;

// How each built-in tool reads; any other tool shows as `other`.
const toolShapes: Record<string, (input: unknown) => ToolShape | undefined> = {
  Write: (input): ToolShape | undefined => {
    if (!isWriteInput(input)) return;
    const { file_path: path, content } = input;
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
  Edit: (input): ToolShape | undefined => {
    if (!isEditInput(input)) return;
    const { file_path: path, old_string, new_string } = input;
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
  Read: (input): ToolShape | undefined => {
    if (!isReadInput(input)) return;
    const { file_path: path, offset: line } = input;
    return {
      title: `Read ${path}`,
      kind: 'read',
      locations: [line === undefined ? { path } : { path, line }],
      content: [],
    };
  },
  Bash: (input): ToolShape | undefined => {
    if (!isBashInput(input)) return;
    return {
      title: input.description ?? input.command,
      kind: 'execute',
      content: [{ type: 'terminal', command: input.command, output: '' }],
    };
  },
  Grep: (input): ToolShape | undefined =>
    isGrepInput(input) ? search('Grep', input.pattern) : undefined,
  Glob: (input): ToolShape | undefined =>
    isGlobInput(input) ? search('Glob', input.pattern) : undefined,
  WebFetch: (input): ToolShape | undefined =>
    isWebFetchInput(input)
      ? { title: `Fetch ${input.url}`, kind: 'fetch', content: [] }
      : undefined,
  WebSearch: (input): ToolShape | undefined =>
    isWebSearchInput(input)
      ? { title: `Search ${input.query}`, kind: 'fetch', content: [] }
      : undefined,
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
    block.name === 'Bash' && isBashInput(block.input)
      ? block.input.description
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

function userRejected(message: MappedUser, toolCallId: string): boolean {
  const meta = isToolResultMeta(message)
    ? (message.tool_result_meta ?? [])
    : [];
  return meta.some(
    (entry): boolean =>
      entry.id === toolCallId && entry.non_execution_kind === 'user-rejected',
  );
}

// What the Write tool found at the path before it wrote; null for a new file.
function overwrittenText(row: ToolCallRow, message: MappedUser): string | null {
  if (row.name !== 'Write') return null;
  const output = message.tool_use_result;
  return isWriteResult(output) ? output.originalFile : null;
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
  message: MappedUser & { receivedAt?: number },
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
    const changes = block.changes.map(
      (change): DiffChange & { operation: 'modify'; oldText: string } => ({
        ...change,
        operation: 'modify' as const,
        oldText,
      }),
    );
    return { ...block, changes };
  });

  if (rejected) return settled(row, 'cancelled', content);
  if (!result.is_error) {
    if (row.kind === 'read' || row.kind === 'search') {
      const read = message.tool_use_result;
      const text =
        row.kind === 'read' && isTextReadResult(read)
          ? read.file.content
          : output;
      content.push({ type: 'content', content: { type: 'text', text } });
    }
    return settled(row, 'completed', content);
  }
  // A failed call shows its error, unless a terminal already shows the output.
  if (
    content.some(
      (
        block,
      ): block is {
        type: 'terminal';
        command: string;
        cwd?: string;
        output: string;
        exitStatus?: { exitCode?: number; signal?: string };
      } => block.type === 'terminal',
    )
  )
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
