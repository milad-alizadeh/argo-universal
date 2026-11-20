import { z } from 'zod';

/*
 * A picture of the person's whole screen, held in memory for the one reader that asked for it: never stored, never
 * drawn in the Feed (ADR-0064). `data` is the image's bytes in base64.
 */
export const ScreenImage = z.strictObject({
  mimeType: z.enum(['image/png', 'image/jpeg']),
  data: z.string().min(1),
});

export type ScreenImage = z.infer<typeof ScreenImage>;

// What the App answers a capture request with. It never claims a picture it did not take.
export const ScreenCaptureAnswer = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('captured'), image: ScreenImage }),
  // The person has not turned screen sight on for this Device.
  z.strictObject({
    status: z.literal('refused'),
    reason: z.literal('off'),
  }),
  // The App cannot capture now; `reason` says what to do, such as granting Screen Recording on macOS.
  z.strictObject({
    status: z.literal('not_available'),
    reason: z.string().min(1),
  }),
]);

export type ScreenCaptureAnswer = z.infer<typeof ScreenCaptureAnswer>;

/*
 * `captured` carries the image. `refused` says why: `off` (this Device's screen sight is turned off). `not_opened`
 * means no App that can capture was reachable. `not_available` means the App could not capture, and says what to do.
 */
export const AppScreenshotResult = z.discriminatedUnion('status', [
  ...ScreenCaptureAnswer.options,
  z.strictObject({ status: z.literal('not_opened') }),
]);

export type AppScreenshotResult = z.infer<typeof AppScreenshotResult>;

// Who asked for a capture, so the Feed's Notice can say.
export const ScreenRequester = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('person') }),
  z.strictObject({ kind: z.literal('agent'), sessionId: z.string().min(1) }),
  z.strictObject({ kind: z.literal('voice'), sessionId: z.string().min(1) }),
]);

export type ScreenRequester = z.infer<typeof ScreenRequester>;

// What the Server sends an App Connection that can capture: that it is listening, then each request to answer.
export const ScreenSightStreamEvent = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('ready') }),
  z.strictObject({
    type: z.literal('capture'),
    requestId: z.string().min(1),
    requester: ScreenRequester,
  }),
]);

export type ScreenSightStreamEvent = z.infer<typeof ScreenSightStreamEvent>;

export const ScreenSightReply = z.strictObject({
  requestId: z.string().min(1),
  answer: ScreenCaptureAnswer,
});

export type ScreenSightReply = z.infer<typeof ScreenSightReply>;
