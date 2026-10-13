import { z } from 'zod';

export const TerminalControlMessage = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready'), token: z.string().uuid() }),
  z.strictObject({
    type: z.literal('exit'),
    exitCode: z.number().int(),
    signal: z.number().int().optional(),
  }),
]);

export type TerminalControlMessage = z.infer<typeof TerminalControlMessage>;

export const TerminalLaunchMessage = z.strictObject({
  executable: z.string(),
  args: z.array(z.string()),
  cwd: z.string(),
  env: z.record(z.string(), z.string()),
});

export type TerminalLaunchMessage = z.infer<typeof TerminalLaunchMessage>;
