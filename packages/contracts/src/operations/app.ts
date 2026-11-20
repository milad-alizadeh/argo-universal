import { z } from 'zod';
import { ScreenDestination } from '../navigation/screen-link';
import type { OperationDefinition } from './index';

/*
 * `delivered` means one local desktop App's Connection was handed the destination; the App still checks it and
 * may refuse it, so it never says the Screen opened. `not_opened` means no such App was connected; `link` is
 * the Server-qualified Screen link a person can open instead.
 */
export const AppOpenResult = z.strictObject({
  status: z.enum(['delivered', 'not_opened']),
  link: z.string().min(1),
});

export type AppOpenResult = z.infer<typeof AppOpenResult>;

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
  // The person turned screen sight off on this Device, or declined the display prompt.
  z.strictObject({
    status: z.literal('refused'),
    reason: z.enum(['off', 'declined']),
  }),
  // The App cannot capture now; `reason` says what to do, such as granting Screen Recording on macOS.
  z.strictObject({
    status: z.literal('not_available'),
    reason: z.string().min(1),
  }),
]);

export type ScreenCaptureAnswer = z.infer<typeof ScreenCaptureAnswer>;

/*
 * `captured` carries the image. `refused` says why: `off` (Settings) or `declined` (the person said no). `not_opened`
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

// What an App reports when it listens: whether this Device turned screen sight on. Off until the person turns it on.
export const ScreenSightReport = z.strictObject({ enabled: z.boolean() });

export type ScreenSightReport = z.infer<typeof ScreenSightReport>;

export const ScreenSightReply = z.strictObject({
  requestId: z.string().min(1),
  answer: ScreenCaptureAnswer,
});

export type ScreenSightReply = z.infer<typeof ScreenSightReply>;

export const appOperations = {
  'app.open': {
    id: 'app.open',
    label: 'Open Screen',
    icon: 'app-window',
    description:
      'Ask the desktop App on this Server’s device to open a Screen: a Session, the Sessions list, a Project, Agents, Settings or a Plugin Page. It does not launch the App; with none connected it answers not_opened and the link to open.',
    params: z.strictObject({ destination: ScreenDestination }),
    result: AppOpenResult,
    tier: 'act',
    keywords: ['navigate', 'screen', 'link', 'show', 'focus'],
  },
  'app.screenshot': {
    id: 'app.screenshot',
    label: 'See the screen',
    icon: 'app-window',
    description:
      'Take one picture of the person’s whole screen and return it as an image, so you can see what they see. It always asks the person first, whatever mode you are in, and works only when they turned screen sight on in Settings. It answers captured with the image, refused with why (off or declined), not_opened when no desktop App is reachable, or not_available with what to do. The picture is never stored; the Feed shows one Notice that a capture was taken.',
    params: z.strictObject({}).default({}),
    result: AppScreenshotResult,
    tier: 'confirm',
    keywords: ['screen', 'screenshot', 'see', 'look', 'capture', 'display'],
  },
} as const satisfies Record<string, OperationDefinition>;
