import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ImageContent, TextContent } from '../feed/content-block';

// Where a Session runs (ADR-0008).
export const CheckoutChoice = z.enum(['worktree', 'main']);
export type CheckoutChoice = z.infer<typeof CheckoutChoice>;

export const SessionCheckoutChoice = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('worktree'),
    baseBranch: z.string(),
  }),
  z.strictObject({ type: z.literal('main') }),
]);
export type SessionCheckoutChoice = z.infer<typeof SessionCheckoutChoice>;

export const InitialConfigOption = z.strictObject({
  configId: z.string(),
  value: z.union([z.string(), z.boolean()]),
});
export type InitialConfigOption = z.infer<typeof InitialConfigOption>;

// Creation can leave the real Session empty while its configuration is selected.
export const SessionNewInput = z.strictObject({
  projectId: sessionColumns.shape.projectId,
  agent: sessionColumns.shape.agent,
  checkout: SessionCheckoutChoice,
  configOptions: z.array(InitialConfigOption),
  prompt: z
    .array(z.discriminatedUnion('type', [TextContent, ImageContent]))
    .default([]),
});
export type SessionNewInput = z.infer<typeof SessionNewInput>;

export const SessionNewOutput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});
export type SessionNewOutput = z.infer<typeof SessionNewOutput>;
