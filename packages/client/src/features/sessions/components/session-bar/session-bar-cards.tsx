import { Icon } from '@repo/kit/primitives/content/icon';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactNode } from 'react';
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
type Lines = [SessionBarEntry, ...SessionBarEntry[]];

type RowProps = Pick<SessionBarProps, 'onOpen'> & { entry: SessionBarEntry };

export const sessionBarCards = (
  bar: SessionBarProps | undefined,
): WorkbenchSection[] =>
  bar
    ? groupedLines([bar.shown, ...bar.hidden]).map((lines) =>
        pluginCard(lines, bar.onOpen),
      )
    : [];

function groupedLines(lines: SessionBarEntry[]): Lines[] {
  const grouped = new Map<string, Lines>();

  for (const entry of lines) {
    const entries = grouped.get(entry.pluginId);

    if (entries) entries.push(entry);
    else grouped.set(entry.pluginId, [entry]);
  }

  return [...grouped.values()];
}

const pluginCard = (
  [first, ...rest]: Lines,
  onOpen: SessionBarProps['onOpen'],
): WorkbenchSection =>
  rest.length === 0
    ? lineCard(first, onOpen)
    : {
        ...lineCard(first, onOpen),
        onOpen: undefined,
        noRows: false,
        summary: <CardLines lines={[first, ...rest]} onOpen={onOpen} />,
      };

function CardLines({
  lines,
  onOpen,
}: Pick<SessionBarProps, 'onOpen'> & { lines: Lines }): ReactNode {
  return (
    <List appearance="plain" density="compact" padding={0} fit>
      <ListSection>
        {lines.map((entry) => (
          <BarRow key={rowKey(entry)} entry={entry} onOpen={onOpen} />
        ))}
      </ListSection>
    </List>
  );
}

function BarRow({ entry, onOpen }: RowProps): ReactNode {
  return (
    <ListItem
      title={entry.text}
      leading={
        entry.icon && <Icon name={entry.icon} tone={entry.tone ?? 'muted'} />
      }
      accessibilityLabel={`${openLabel(entry)}: ${entry.text}`}
      onPress={openRow(entry, onOpen)}
    />
  );
}

const openRow = (
  entry: SessionBarEntry,
  onOpen: SessionBarProps['onOpen'],
): (() => void) | undefined =>
  entry.path === undefined ? undefined : (): void => onOpen(entry);

const rowKey = ({ path, text }: SessionBarEntry): string =>
  JSON.stringify([path, text]);
