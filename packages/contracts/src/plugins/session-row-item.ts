import { z } from 'zod';
import { tones } from '#kit-tokens';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

// Where a pull request is, as data: Argo draws its own Change stage mark from it, in place of the item's icon.
export const SessionRowChange = z.strictObject({
  stage: z.enum(['open', 'merged', 'closed']),
  draft: z.boolean().optional(),
  conflict: z.boolean().optional(),
});

// A Session row's meta text stays one short label beside Argo's own items; its tooltip, a sentence.
export const sessionRowTextLimit = 40;

export const sessionRowTooltipLimit = 200;

// One item on a Session row's meta line. Argo draws it; a Plugin never sends a kit tree here.
export const SessionRowItem = z.strictObject({
  icon: PluginIcon.optional(),
  // A pull request's stage; Argo draws the Change stage mark and tone for it, so `icon` and `tone` are ignored.
  change: SessionRowChange.optional(),
  text: z.string().trim().min(1).max(sessionRowTextLimit),
  tone: z.enum(tones).optional(),
  tooltip: z.string().trim().min(1).max(sessionRowTooltipLimit).optional(),
  // Opens this Plugin page when the item is pressed.
  action: z.strictObject({ path: PluginPath }).optional(),
});

export type SessionRowItem = z.infer<typeof SessionRowItem>;
