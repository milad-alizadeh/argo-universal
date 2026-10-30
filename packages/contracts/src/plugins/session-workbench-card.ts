import { z } from 'zod';
import { PluginIdentifier } from '#plugin-identifier';
import { PluginIcon, PluginPath } from '#plugin-manifest-fields';

export const sessionWorkbenchSlotId = 'argo/session/workbench/v1';

// A card's title names it in the Workbench column, in the Inspector's tab bar and in a phone's Workbench menu.
export const workbenchCardTitleLimit = 40;

/*
 * One card a Plugin adds to a Session's Workbench (ADR-0035, ADR-0039). Argo draws the card and owns where it goes,
 * in what order and when it closes; the Plugin draws `page` inside it with any kit components, as on its own pages.
 * A card with a `tab` opens that page in full as an Inspector tab when it is pressed; one without stays a card.
 */
export const SessionWorkbenchCard = z.strictObject({
  id: PluginIdentifier,
  title: z.string().trim().min(1).max(workbenchCardTitleLimit),
  icon: PluginIcon,
  page: PluginPath,
  tab: PluginPath.optional(),
});

export type SessionWorkbenchCard = z.infer<typeof SessionWorkbenchCard>;
