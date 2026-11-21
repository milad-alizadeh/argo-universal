import { z } from 'zod';
import { RunConfigurationStatus } from './run';
import { shellId } from './shell-terminal';

const sessionId = z
  .string()
  .optional()
  .describe(
    'The Session whose Checkout holds the Terminal; a Session that runs this uses its own.',
  );

const name = z
  .string()
  .min(1)
  .describe('The name of the Run Configuration whose Run it is.');

const longestInput = 10_000;

const mostScrollback = 1000;

const scrollback = z
  .int()
  .min(0)
  .max(mostScrollback)
  .optional()
  .describe('How many lines above the screen to read; 100 by default.');

const input = z
  .string()
  .min(1)
  .max(longestInput)
  .describe('The keystrokes to type, exactly. Add \\r to press Enter.');

export const TerminalReadParams = z.union([
  z.strictObject({ sessionId, name, scrollback }),
  z.strictObject({ sessionId, shellId, scrollback }),
]);

export type TerminalReadParams = z.infer<typeof TerminalReadParams>;

export const TerminalSendParams = z.union([
  z.strictObject({ sessionId, name, input }),
  z.strictObject({ sessionId, shellId, input }),
]);

export type TerminalSendParams = z.infer<typeof TerminalSendParams>;

export const TerminalReadResult = z.strictObject({
  name: z.string(),
  status: RunConfigurationStatus,
  exitCode: z.int().nullable(),
  screen: z.string(),
  scrollback: z.string(),
});

export type TerminalReadResult = z.infer<typeof TerminalReadResult>;

export const TerminalSendResult = z.strictObject({
  name: z.string(),
  status: RunConfigurationStatus,
});

export type TerminalSendResult = z.infer<typeof TerminalSendResult>;

const maxTerminalColumns = 512;

const maxTerminalRows = 256;

const terminalDimensions = {
  columns: z.int().min(2).max(maxTerminalColumns),
  rows: z.int().min(1).max(maxTerminalRows),
};

export const TerminalResizeParams = z.union([
  z.strictObject({ sessionId, name, ...terminalDimensions }),
  z.strictObject({ sessionId, shellId, ...terminalDimensions }),
]);

export const TerminalResizeResult = z.strictObject({});
