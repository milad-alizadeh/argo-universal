import type { WorkbenchSection } from '../session-workbench';
import {
  openLabel,
  type SessionBarEntry,
  type SessionBarProps,
  SessionBarLine,
} from './session-bar';

// A line's card is keyed by its Plugin, so it never meets one of Argo's Section keys or a Plugin card's.
const sessionBarCardKey = (pluginId: string): string => `bar:${pluginId}`;

const lineCard = (
  entry: SessionBarEntry,
  onOpen: SessionBarProps['onOpen'],
): WorkbenchSection => ({
  key: sessionBarCardKey(entry.pluginId),
  title: entry.pluginName,
  summary: <SessionBarLine entry={entry} />,
  onOpen: entry.path === undefined ? undefined : () => onOpen(entry),
  noRows: true,
  // It opens the Plugin's page, as the strip's Open does, not an overview.
  openLabel: openLabel(entry),
});

/*
 * Where a Session's page has a Workbench, its Session bar lines are Workbench cards instead of a strip under the header
 * (#2012): one card a Plugin, in Slot order, so nothing waits behind "+N". A card opens its line's Plugin page, has
 * no Inspector tab, and hides with the Workbench.
 */
export const sessionBarCards = (
  bar: SessionBarProps | undefined,
): WorkbenchSection[] =>
  bar
    ? [bar.shown, ...bar.hidden].map((entry) => lineCard(entry, bar.onOpen))
    : [];
