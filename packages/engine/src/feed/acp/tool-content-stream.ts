import type { FeedUpdate } from '@repo/contracts';
import type { AcpContentInput } from './assembly';
import { capToolOutput } from './tool-output';
import type { ToolUpdate } from './tool-terminal-metadata';

type ToolRow = Extract<FeedUpdate, { sessionUpdate: 'tool_call_update' }>;

type ToolContents = NonNullable<AcpContentInput['toolContents']>;

export const restoreToolContent = (
  row: ToolRow,
  contents: ToolContents = {},
): ToolRow => ({
  ...row,
  content: contents[row.id] ?? row.content,
});

export const suppliedToolContent = (
  update: ToolUpdate,
  previous: ToolRow,
  assembled: ToolRow,
): boolean => update.content != null || assembled.content !== previous.content;

// Keep the whole open stream for later chunks; only its capped copy reaches storage and Apps.
export const retainToolContent = (
  contents: ToolContents | undefined,
  assembled: ToolRow,
  capped: ToolRow,
): ToolContents => {
  const next = { ...contents };
  delete next[assembled.id];

  if (assembled.state === 'settled') return next;

  if (capped.content !== assembled.content)
    next[assembled.id] = assembled.content;

  return next;
};

export const capAssembledToolOutput = (
  input: { update: ToolUpdate; toolContents?: ToolContents },
  previous: ToolRow,
  assembled: ToolRow,
): ReturnType<typeof capToolOutput> =>
  capToolOutput(
    assembled,
    input.update,
    suppliedToolContent(input.update, previous, assembled) ||
      Boolean(input.toolContents?.[assembled.id]),
  );
