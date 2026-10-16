import { z } from 'zod';

export const loginTerminalOutputLimit = 262_144;

export const loginTerminalInputLimit = 4096;

const terminalColsLimit = 500;

const terminalRowsLimit = 200;

export const AgentLoginTerminalInput = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('write'),
    text: z.string().min(1).max(loginTerminalInputLimit),
  }),
  z.strictObject({
    type: z.literal('resize'),
    cols: z.number().int().min(2).max(terminalColsLimit),
    rows: z.number().int().min(2).max(terminalRowsLimit),
  }),
]);

export type AgentLoginTerminalInput = z.infer<typeof AgentLoginTerminalInput>;
