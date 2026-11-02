import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { TerminalExitStatus, ToolCallContent } from '@repo/contracts';
import { z } from 'zod';
import { assignPresentField } from './present-field';

export type ToolUpdate = Extract<
  SessionNotification['update'],
  { sessionUpdate: 'tool_call' | 'tool_call_update' }
>;

const terminalInfo = z.object({ terminal_id: z.string(), cwd: z.string() });

const terminalDelta = z.object({ terminal_id: z.string(), data: z.string() });

const terminalExit = z.object({
  terminal_id: z.string(),
  exit_code: z.int().nullable(),
  signal: z.string().nullable(),
});

export type TerminalMetadata = {
  info?: z.infer<typeof terminalInfo>;
  delta?: z.infer<typeof terminalDelta>;
  exit?: z.infer<typeof terminalExit>;
};

const accepted = <Value>(
  result: z.ZodSafeParseResult<Value>,
): Value | undefined => (result.success ? result.data : undefined);

// These fields are an Agent extension; the SDK leaves their payloads opaque.
export const readTerminalMetadata = (
  metadata: ToolUpdate['_meta'],
): TerminalMetadata => {
  const value = metadata ?? {};

  return {
    info: accepted(terminalInfo.safeParse(value.terminal_info)),
    delta: accepted(terminalDelta.safeParse(value.terminal_output_delta)),
    exit: accepted(terminalExit.safeParse(value.terminal_exit)),
  };
};

// claude-agent-acp names only the terminal, with no cwd to draw one from, and sends its output as deltas. Any other shape stays unsupported, which the Feed reports.
export const namesOnlyTerminal = (
  metadata: ToolUpdate['_meta'],
  terminalId: string,
): boolean =>
  z
    .strictObject({ terminal_id: z.literal(terminalId) })
    .safeParse(metadata?.terminal_info).success;

export const terminalIdOf = (block: ToolCallContent): string | undefined =>
  accepted(z.string().safeParse(block._meta?.acp?.terminalId));

export const matchingTerminal = <Value extends { terminal_id: string }>(
  value: Value | undefined,
  terminalId: string | undefined,
): Value | undefined => (value?.terminal_id === terminalId ? value : undefined);

export const terminalExitStatus = (
  exit: NonNullable<TerminalMetadata['exit']>,
): TerminalExitStatus => {
  const status: TerminalExitStatus = {};
  assignPresentField(status, 'exitCode', exit.exit_code);
  assignPresentField(status, 'signal', exit.signal);

  return status;
};

export const retainedTerminalMetadata = (
  metadata: ToolUpdate['_meta'],
): ToolUpdate['_meta'] => {
  if (!readTerminalMetadata(metadata).delta) return metadata;

  return Object.fromEntries(
    Object.entries(metadata ?? {}).filter(
      ([key]) => key !== 'terminal_output_delta',
    ),
  );
};
