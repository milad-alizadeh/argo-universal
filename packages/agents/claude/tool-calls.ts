import type { ToolCallContent, ToolKind } from '@repo/contracts';
import { z } from 'zod';
import type { FeedUpdate } from '../src/agent-events';
import type {
  ToolResultBlock,
  ToolUseBlock,
  UserMessage,
} from './vendor-messages';

export type ToolCallRow = Extract<
  FeedUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

const FilePath = z.object({ file_path: z.string() });
const WriteInput = FilePath.extend({ content: z.string() });
const EditInput = FilePath.extend({
  old_string: z.string(),
  new_string: z.string(),
});
const ReadInput = FilePath.extend({ offset: z.int().optional() });
const BashInput = z.object({
  command: z.string(),
  description: z.string().optional(),
});
const Pattern = z.object({ pattern: z.string() });
const WebFetchInput = z.object({ url: z.string() });
const WebSearchInput = z.object({ query: z.string() });

type ToolShape = Pick<ToolCallRow, 'title' | 'kind' | 'content' | 'locations'>;

// How each built-in tool reads; a tool with an unexpected input shows as `other`.
const toolShapes: Record<string, (input: unknown) => ToolShape | undefined> = {
  Write: (input) => {
    const parsed = WriteInput.safeParse(input);
    if (!parsed.success) return undefined;
    const path = parsed.data.file_path;
    return {
      title: `Write ${path}`,
      kind: 'edit',
      locations: [{ path }],
      content: [
        {
          type: 'diff',
          changes: [{ operation: 'add', path, newText: parsed.data.content }],
        },
      ],
    };
  },
  Edit: (input) => {
    const parsed = EditInput.safeParse(input);
    if (!parsed.success) return undefined;
    const path = parsed.data.file_path;
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
              oldText: parsed.data.old_string,
              newText: parsed.data.new_string,
            },
          ],
        },
      ],
    };
  },
  Read: (input) => {
    const parsed = ReadInput.safeParse(input);
    if (!parsed.success) return undefined;
    const path = parsed.data.file_path;
    const line = parsed.data.offset;
    return {
      title: `Read ${path}`,
      kind: 'read',
      locations: [line === undefined ? { path } : { path, line }],
      content: [],
    };
  },
  Bash: (input) => {
    const parsed = BashInput.safeParse(input);
    if (!parsed.success) return undefined;
    const { command, description } = parsed.data;
    return {
      title: description ?? command,
      kind: 'execute',
      content: [{ type: 'terminal', command, output: '' }],
    };
  },
  Grep: (input) => search('Grep', input),
  Glob: (input) => search('Glob', input),
  WebFetch: (input) => {
    const parsed = WebFetchInput.safeParse(input);
    return parsed.success
      ? { title: `Fetch ${parsed.data.url}`, kind: 'fetch', content: [] }
      : undefined;
  },
  WebSearch: (input) => {
    const parsed = WebSearchInput.safeParse(input);
    return parsed.success
      ? { title: `Search ${parsed.data.query}`, kind: 'fetch', content: [] }
      : undefined;
  },
  ExitPlanMode: () => ({
    title: 'Leave plan mode',
    kind: 'switch_mode',
    content: [],
  }),
};

function search(name: string, input: unknown): ToolShape | undefined {
  const parsed = Pattern.safeParse(input);
  return parsed.success
    ? { title: `${name} ${parsed.data.pattern}`, kind: 'search', content: [] }
    : undefined;
}

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
    : (result.content ?? []).flatMap((block) => block.text ?? []).join('\n');

// What the Write tool found at the path before it wrote.
const WriteOutcome = z.object({
  type: z.enum(['create', 'update']),
  originalFile: z.string().nullable(),
});

// The settled row for a Tool call once its result arrives.
export function toolCallEnded(
  row: ToolCallRow,
  result: ToolResultBlock,
  message: UserMessage,
): ToolCallRow {
  const rejected = message.tool_result_meta?.some(
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
  const writeOutcome = WriteOutcome.safeParse(message.tool_use_result);
  const content = row.content.map((block): ToolCallContent => {
    if (block.type === 'terminal') return { ...block, output };
    const originalFile = writeOutcome.data?.originalFile;
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
