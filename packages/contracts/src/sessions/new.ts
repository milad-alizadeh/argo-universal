import { z } from 'zod';
import { SessionConfigOption } from './set-config-option';

// Where a new Session runs: its own worktree, or the Project's main checkout (ADR-0008).
export const CheckoutChoice = z.enum(['worktree', 'main']);
export type CheckoutChoice = z.infer<typeof CheckoutChoice>;

// Input of `session.new`. `agent` is the id that an Agent adapter registers.
export const SessionNewInput = z.strictObject({
  projectId: z.string().min(1),
  agent: z.string().min(1),
  checkout: CheckoutChoice,
});
export type SessionNewInput = z.infer<typeof SessionNewInput>;

// Output of `session.new`, after ACP `NewSessionResponse`.
export const SessionNewOutput = z.strictObject({
  sessionId: z.string().min(1),
  configOptions: z.array(SessionConfigOption),
});
export type SessionNewOutput = z.infer<typeof SessionNewOutput>;
