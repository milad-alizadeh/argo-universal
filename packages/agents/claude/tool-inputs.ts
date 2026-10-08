import { isAskUserQuestionInput } from './question-input.ts';
export { isAskUserQuestionInput } from './question-input.ts';
import type {
  BashInput,
  ExitPlanModeInput,
  FileEditInput,
  FileReadInput,
  FileWriteInput,
  GlobInput,
  GrepInput,
  WebFetchInput,
  WebSearchInput,
} from '@anthropic-ai/claude-agent-sdk/sdk-tools';
import {
  arrayOf,
  hasFields,
  isBoolean,
  isNumber,
  isRecord,
  isString,
  oneOf,
  optional,
} from '../src/payload-shape.ts';

export interface ToolInputs {
  Write: FileWriteInput;
  Edit: FileEditInput;
  Read: FileReadInput;
  Bash: BashInput;
  Grep: GrepInput;
  Glob: GlobInput;
  WebFetch: WebFetchInput;
  WebSearch: WebSearchInput;
  ExitPlanMode: ExitPlanModeInput & { plan: string; planFilePath?: string };
  AskUserQuestion: import('@anthropic-ai/claude-agent-sdk/sdk-tools').AskUserQuestionInput;
}

export const isWriteInput = (value: unknown): value is ToolInputs['Write'] =>
  hasFields(value, { file_path: isString, content: isString });
export const isEditInput = (value: unknown): value is ToolInputs['Edit'] =>
  hasFields(value, {
    file_path: isString,
    old_string: isString,
    new_string: isString,
    replace_all: optional(isBoolean),
  });
export const isReadInput = (value: unknown): value is ToolInputs['Read'] =>
  hasFields(value, {
    file_path: isString,
    offset: optional(isNumber),
    limit: optional(isNumber),
    pages: optional(isString),
  });
export const isBashInput = (value: unknown): value is ToolInputs['Bash'] =>
  hasFields(value, {
    command: isString,
    timeout: optional(isNumber),
    description: optional(isString),
    run_in_background: optional(isBoolean),
    dangerouslyDisableSandbox: optional(isBoolean),
  });
export const isGlobInput = (value: unknown): value is ToolInputs['Glob'] =>
  hasFields(value, { pattern: isString, path: optional(isString) });
const grepFields = {
  pattern: isString,
  path: optional(isString),
  glob: optional(isString),
  output_mode: optional(oneOf('content', 'files_with_matches', 'count')),
  '-B': optional(isNumber),
  '-A': optional(isNumber),
  '-C': optional(isNumber),
  context: optional(isNumber),
  '-n': optional(isBoolean),
  '-i': optional(isBoolean),
  '-o': optional(isBoolean),
  type: optional(isString),
  head_limit: optional(isNumber),
  offset: optional(isNumber),
  multiline: optional(isBoolean),
};
export const isGrepInput = (value: unknown): value is ToolInputs['Grep'] =>
  hasFields(value, grepFields);
export const isWebFetchInput = (
  value: unknown,
): value is ToolInputs['WebFetch'] =>
  hasFields(value, { url: isString, prompt: isString });
export const isWebSearchInput = (
  value: unknown,
): value is ToolInputs['WebSearch'] =>
  hasFields(value, {
    query: isString,
    allowed_domains: optional(arrayOf(isString)),
    blocked_domains: optional(arrayOf(isString)),
  });

const isAllowedPrompt = (
  value: unknown,
): value is NonNullable<ExitPlanModeInput['allowedPrompts']>[number] =>
  hasFields(value, { tool: oneOf('Bash'), prompt: isString });
export const isExitPlanModeInput = (
  value: unknown,
): value is ToolInputs['ExitPlanMode'] =>
  hasFields(value, {
    plan: isString,
    planFilePath: optional(isString),
    allowedPrompts: optional(arrayOf(isAllowedPrompt)),
  });

const toolInputPredicates = {
  Write: isWriteInput,
  Edit: isEditInput,
  Read: isReadInput,
  Bash: isBashInput,
  Grep: isGrepInput,
  Glob: isGlobInput,
  WebFetch: isWebFetchInput,
  WebSearch: isWebSearchInput,
  ExitPlanMode: isExitPlanModeInput,
  AskUserQuestion: isAskUserQuestionInput,
} satisfies {
  [Name in keyof ToolInputs]: (value: unknown) => value is ToolInputs[Name];
};

export function acceptsToolInput(name: string, value: unknown): boolean {
  const entry = Object.entries(toolInputPredicates).find(
    ([tool]): boolean => tool === name,
  );
  return entry?.[1](value) ?? isRecord(value);
}
