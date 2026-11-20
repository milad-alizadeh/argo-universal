import { z } from 'zod';
import { sessionColumns } from '../columns';

/*
 * Archive is accepted only when no Turn runs. The Engine keeps the branch and
 * removes the worktree after 5 seconds; a main Checkout is never removed.
 */
export const SessionArchiveInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
  inspectCheckout: z.literal(true).optional(),
  checkoutApproval: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .optional(),
});

export type SessionArchiveInput = z.infer<typeof SessionArchiveInput>;

export const SessionArchiveOutput = z.strictObject({
  scheduled: z.literal(true).optional(),
  checkoutConfirmation: z
    .strictObject({
      fingerprint: z.string(),
      reason: z.string(),
    })
    .optional(),
});

export type SessionArchiveOutput = z.infer<typeof SessionArchiveOutput>;

/*
 * Unarchive is only Undo during the 5-second archive window. The Engine returns
 * CONFLICT after Checkout removal, or after the same window for a main Checkout.
 */
export const SessionUnarchiveInput = z.strictObject({
  sessionId: sessionColumns.shape.id,
});

export type SessionUnarchiveInput = z.infer<typeof SessionUnarchiveInput>;

export const SessionUnarchiveOutput = z.strictObject({});

export type SessionUnarchiveOutput = z.infer<typeof SessionUnarchiveOutput>;
