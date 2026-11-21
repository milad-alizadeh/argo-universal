import { z } from 'zod';

export const ShellTerminal = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  cwd: z.string().min(1),
});

export type ShellTerminal = z.infer<typeof ShellTerminal>;

export const ShellTerminalOpenParams = z.strictObject({
  sessionId: z.string().min(1),
});

export const shellId = z.string().min(1).describe('The shell Terminal ID.');

export const ShellTerminalCloseParams = ShellTerminalOpenParams.extend({
  shellId,
});
