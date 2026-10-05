import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  BashInput,
  FileEditInput,
  FileReadInput,
  FileWriteInput,
  FileWriteOutput,
  GlobInput,
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
  Grep: (input) => search('Grep', input),
  Glob: (input) => search('Glob', input),
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

// Grep's input names its pattern the same way as Glob's.
const search = (name: string, input: unknown): ToolShape => ({
  title: `${name} ${(input as GlobInput).pattern}`,
  kind: 'search',
  content: [],
});

// The open row for a Tool call the model asked for.
export function toolCallStarted(block: ToolUseBlock): ToolCallRow {
  const shape = toolShapes[block.name]?.(block.input) ?? {
    title: block.name,
    kind: 'other' satisfies ToolKind,
    content: [],
  };
  return {
    id: block.id,
    sessionUpdate: 'tool_call_update',
    state: 'open',
    toolCallId: block.id,
    name: block.name,
    status: 'in_progress',
    rawInput: block.input,
    ...shape,
  };
}

const resultText = (result: ToolResultBlock) =>
  typeof result.content === 'string'
    ? result.content
    : (result.content ?? [])
        .flatMap((block) => (block.type === 'text' ? [block.text] : []))
        .join('\n');

// The settled row for a Tool call once its result arrives.
export function toolCallEnded(
  row: ToolCallRow,
  result: ToolResultBlock,
  message: SDKUserMessage,
): ToolCallRow {
  const rejected = (message as ToolResultMeta).tool_result_meta?.some(
    (meta) =>
      meta.id === result.tool_use_id &&
      meta.non_execution_kind === 'user-rejected',
  );
  const status = rejected
    ? 'cancelled'
    : result.is_error
      ? 'failed'
      : 'completed';
  const output = rejected ? '' : resultText(result);
  // What the Write tool found at the path before it wrote.
  const originalFile =
    row.name === 'Write'
      ? (message.tool_use_result as FileWriteOutput | undefined)?.originalFile
      : undefined;
  const content = row.content.map((block): ToolCallContent => {
    if (block.type === 'terminal') return { ...block, output };
    if (block.type === 'diff' && typeof originalFile === 'string')
      return {
        ...block,
        changes: block.changes.map((change) => ({
          ...change,
          operation: 'modify',
          oldText: originalFile,
        })),
      };
    return block;
  });
  const showsOutput = content.some((block) => block.type === 'terminal');
  return {
    ...row,
    state: 'settled',
    status,
    content:
      status === 'failed' && !showsOutput
        ? [
            ...content,
            { type: 'content', content: { type: 'text', text: output } },
          ]
        : content,
  };
}
