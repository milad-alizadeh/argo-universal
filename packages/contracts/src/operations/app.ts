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

export const appOperations = {
  'app.open': {
    id: 'app.open',
    label: 'Open Screen',
    description:
      'Ask the desktop App on this Server’s device to open a Screen: a Session, the Sessions list, a Project, Agents, Settings or a Plugin Page. It does not launch the App; with none connected it answers not_opened and the link to open.',
    params: z.strictObject({ destination: ScreenDestination }),
    result: AppOpenResult,
    tier: 'act',
    keywords: ['navigate', 'screen', 'link', 'show', 'focus'],
  },
} as const satisfies Record<string, OperationDefinition>;
