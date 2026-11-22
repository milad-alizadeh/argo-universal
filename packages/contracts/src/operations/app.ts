import { z } from 'zod';
import { ScreenDestination } from '../navigation/screen-link';
import type { ImageVisibility } from './image-visibility';
import type { OperationDefinition } from './index';
import { AppScreenshotResult } from './screen-sight';

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

const capturedScreen = z.looseObject({
  status: z.literal('captured'),
  image: z.looseObject({ data: z.string(), mimeType: z.string() }),
});

const capturedStatus = { status: 'captured' } as const;

const screenVisibility: ImageVisibility = {
  forAgent(result) {
    const capture = capturedScreen.safeParse(result);

    if (!capture.success) return null;

    const { data, mimeType } = capture.data.image;

    return { summary: capturedStatus, image: { data, mimeType } };
  },
  forToolCall(result) {
    const capture = AppScreenshotResult.safeParse(result);

    return capture.data?.status === 'captured' ? capturedStatus : null;
  },
};

export const appOperations = {
  'app.open': {
    id: 'app.open',
    label: 'Open Screen',
    icon: 'app-window',
    description:
      'Open a Screen in the desktop App on the Server’s Device. Destinations include a Session, Sessions, a Project, Agents, Settings or a Plugin Page. It does not launch the App; with none connected it answers not_opened and the link to open.',
    params: z.strictObject({ destination: ScreenDestination }),
    result: AppOpenResult,
    tier: 'act',
    policy: 'allow',
    keywords: ['navigate', 'screen', 'link', 'show', 'focus'],
  },
  'app.screenshot': {
    id: 'app.screenshot',
    label: 'See the screen',
    icon: 'app-window',
    description:
      'Take one picture of the person’s whole screen and return it as an image, so you can see what they see. It needs no permission, and works only when the person turned screen sight on for this Device. It answers captured with the image, refused with why (off), not_opened when no desktop App is reachable, or not_available with what to do. The picture is never stored; the Feed shows one Notice that a capture was taken.',
    params: z.strictObject({}).default({}),
    result: AppScreenshotResult,
    imageVisibility: screenVisibility,
    tier: 'act',
    policy: 'allow',
    keywords: ['screen', 'screenshot', 'see', 'look', 'capture', 'display'],
  },
} as const satisfies Record<string, OperationDefinition>;
