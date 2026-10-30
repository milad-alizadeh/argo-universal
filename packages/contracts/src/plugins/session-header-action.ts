import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

export const sessionHeaderSlotId = 'argo/session/header/v1';

// A header action's label names an icon button and a menu row, so it stays a short verb phrase.
export const sessionHeaderLabelLimit = 40;

/*
 * What pressing a header action does: open one of the Plugin's own pages, or open the Workbench card the Plugin
 * declares under `cardId` and close it when it is already open. Running a Plugin action waits for a Plugin API to
 * call (ADR-0035).
 */
export const SessionHeaderTarget = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('page'), path: PluginPath }),
  z.strictObject({ type: z.literal('card'), cardId: PluginIdentifier }),
]);

export type SessionHeaderTarget = z.infer<typeof SessionHeaderTarget>;

/*
 * One action a Plugin adds to a Session's header (ADR-0035, ADR-0043). `header` sits beside Argo's icons on a desktop
 * and overflows into "…" past the limit; `menu` is always in "…", as every action is on a phone.
 */
export const SessionHeaderAction = z.strictObject({
  id: PluginIdentifier,
  label: z.string().trim().min(1).max(sessionHeaderLabelLimit),
  icon: PluginIcon,
  placement: z.enum(['header', 'menu']),
  target: SessionHeaderTarget,
});

export type SessionHeaderAction = z.infer<typeof SessionHeaderAction>;
