import { z } from 'zod';
import { tones } from '#kit-tokens';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

// The Session bar is one line across the Session's column, so its text may run longer than a row's meta label.
const sessionBarTextLimit = 80;

// The Session bar's one line from one Plugin, such as "#412 · In review". Argo draws it; a Plugin never sends a kit tree here.
export const SessionBarItem = z.strictObject({
  icon: PluginIcon.optional(),
  text: z.string().trim().min(1).max(sessionBarTextLimit),
  // The line's icon and text in this tone, such as an Issue's state; a Session row's item says it the same way.
  tone: z.enum(tones).optional(),
  // The Plugin page the bar's Open goes to.
  action: z.strictObject({ path: PluginPath }).optional(),
});

export type SessionBarItem = z.infer<typeof SessionBarItem>;
