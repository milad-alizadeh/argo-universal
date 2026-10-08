import type { ToolCallContent } from '@repo/contracts';
import { ContentBlock } from '@repo/contracts';
import { DiffChange } from '@repo/contracts';
import { dictionary } from './dictionary';
import type { SDKUserMessage } from './messages';
import type { ToolCallRow, ToolResultBlock } from './tool-rows';
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

type User = SDKUserMessage & { receivedAt?: number };
export function toolCallEnded(
  startedRow: ToolCallRow,
  result: ToolResultBlock,
  message: User,
): ToolCallRow {
  const row = endTimestamp(startedRow, message);
  const rejected = userRejected(message, result.tool_use_id);
  const output = rejected ? '' : resultText(result);
  const content = resultContent(row, message, output);
  if (rejected) return settled(row, 'cancelled', content);
  return completedTool({ row, result, message, output, content });
}
type ResultContent = {
  row: ToolCallRow;
  result: ToolResultBlock;
  message: User;
  output: string;
  content: ToolCallContent[];
};
function endTimestamp(row: ToolCallRow, message: User): ToolCallRow {
  const endedAt = resultTime(message);
  return endedAt === undefined
    ? row
    : { ...row, _meta: { argo: { ...row._meta?.argo, endedAt } } };
}
function resultTime(message: User): number | undefined {
  return message.timestamp === undefined
    ? message.receivedAt
    : Date.parse(message.timestamp);
}
function resultContent(
  row: ToolCallRow,
  message: User,
  output: string,
): ToolCallContent[] {
  const oldText = overwrittenText(row, message);
  return row.content.map((block): ToolCallContent =>
    updateContent(block, { oldText, output }),
  );
}
function updateContent(
  block: ToolCallContent,
  { oldText, output }: { oldText: string | null; output: string },
): ToolCallContent {
  if (block.type === 'terminal') return { ...block, output };
  if (block.type !== 'diff') return block;
  return overwrittenDiff(block, oldText);
}
function completedTool(input: ResultContent): ToolCallRow {
  if (input.result.is_error) return failedTool(input);
  if (readsOutput(input.row))
    input.content.push({
      type: 'content',
      content: { type: 'text', text: readText(input) },
    });
  return settled(input.row, 'completed', input.content);
}
function readText({ row, message, output }: ResultContent): string {
  const read = message.tool_use_result;
  if (!hasReadResult(row, read)) return output;
  const fields = dictionary(read);
  return fields.type === 'text'
    ? ContentBlock.options[0].shape.text.parse(dictionary(fields.file).content)
    : output;
}
function failedTool({ row, content, output }: ResultContent): ToolCallRow {
  if (content.some((block): boolean => block.type === 'terminal'))
    return settled(row, 'failed', content);
  return settled(row, 'failed', [
    ...content,
    { type: 'content', content: { type: 'text', text: output } },
  ]);
}

function overwrittenDiff(
  block: Extract<ToolCallContent, { type: 'diff' }>,
  oldText: string | null,
): ToolCallContent {
  if (oldText === null) return block;
  return {
    ...block,
    changes: block.changes.map((change): DiffChange => ({
      ...change,
      operation: 'modify',
      oldText,
    })),
  };
}

function readsOutput(row: ToolCallRow): boolean {
  return row.kind === 'read' || row.kind === 'search';
}

function hasReadResult(row: ToolCallRow, read: unknown): boolean {
  return row.kind === 'read' && read !== undefined;
}
