import type {
  FileReadOutput,
  FileWriteOutput,
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import {
  arrayOf,
  hasFields,
  isString,
  nullable,
  optional,
} from '../src/payload-shape.ts';

type WriteResult = Pick<FileWriteOutput, 'originalFile'>;
type TextRead = Extract<FileReadOutput, { type: 'text' }>;
type ReadResult = Pick<TextRead, 'type'> & {
  file: Pick<TextRead['file'], 'content'>;
};
// Claude 2.1.286 recordings mark refused Tool calls here; the SDK omits this field.
export interface ToolResultMeta {
  tool_result_meta?: { id: string; non_execution_kind: string }[];
}
const isResultMetaEntry = (
  value: unknown,
): value is NonNullable<ToolResultMeta['tool_result_meta']>[number] =>
  hasFields(value, { id: isString, non_execution_kind: isString });
export const isToolResultMeta = (value: unknown): value is ToolResultMeta =>
  hasFields(value, { tool_result_meta: optional(arrayOf(isResultMetaEntry)) });
export const isWriteResult = (value: unknown): value is WriteResult =>
  hasFields(value, { originalFile: nullable(isString) });
export const isTextReadResult = (value: unknown): value is ReadResult =>
  hasFields(value, {
    type: (type): boolean => type === 'text',
    file: (file): boolean => hasFields(file, { content: isString }),
  });
