import { z } from 'zod';
import { sessionColumns } from '../columns';
import { ImageContent, ResourceLink, TextContent } from '../feed/content-block';

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
  // Cached defaults may disappear when the selected model changes.
  optional: z.boolean().optional(),
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
    .array(
      // A link is an uploaded file (its blob set) or a chosen suggestion's resource (ADR-0023).
      z.discriminatedUnion('type', [TextContent, ImageContent, ResourceLink]),
    )
    .default([]),
});

export type SessionNewInput = z.infer<typeof SessionNewInput>;

export const SessionNewOutput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export type SessionNewOutput = z.infer<typeof SessionNewOutput>;

export const SessionOpenError = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('auth-required') }),
  z.strictObject({ type: z.literal('failed'), message: z.string() }),
]);

export type SessionOpenError = z.infer<typeof SessionOpenError>;

// Reads a tRPC client error, which carries more fields than this; not strict.
export const SessionOpenFailureResponse = z.object({
  data: z.object({ openError: SessionOpenError }),
});

// The text of an auth-required open error, wherever no sign-in callout draws it.
export const authRequiredMessage = 'Authentication required';

// A typed open error as one line: the error's message, and the text where no callout draws it.
export const sessionOpenErrorText = (openError: SessionOpenError): string =>
  openError.type === 'auth-required' ? authRequiredMessage : openError.message;

export class SessionOpenFailure extends Error {
  public constructor(public readonly openError: SessionOpenError) {
    super(sessionOpenErrorText(openError));
  }
}
