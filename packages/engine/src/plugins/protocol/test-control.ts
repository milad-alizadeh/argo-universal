import { z } from 'zod';

// What a test kit asks of a Plugin worker. A new test feature adds an action here, not a protocol message.
export const TestAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('clockState') }),
  z.object({
    action: z.literal('advanceClock'),
    ms: z.number().finite().nonnegative(),
  }),
]);

export type TestAction = z.infer<typeof TestAction>;

export const TestCommand = z.object({
  type: z.literal('test'),
  id: z.number().int().nonnegative(),
  action: TestAction,
});

export const TestClockState = z.object({
  now: z.number(),
  nextAt: z.number().nullable(),
});

export type TestClockState = z.infer<typeof TestClockState>;

export const TestReply = z.object({
  clock: TestClockState.optional(),
  type: z.literal('test.done'),
  id: z.number().int().nonnegative(),
  error: z.string().optional(),
});

export type TestReply = z.infer<typeof TestReply>;
