import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  Menu,
  type MenuAction,
  MenuTrigger,
} from '@repo/kit/primitives/overlays/menu';
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

type Handlers = Pick<SessionBarProps, 'onOpen' | 'onDetach'>;

const lineCard = (
  entry: SessionBarEntry,
  { onOpen }: Handlers,
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

type RowProps = Handlers & { entry: SessionBarEntry };

export const sessionBarCards = (
  bar: SessionBarProps | undefined,
): WorkbenchSection[] =>
  bar ? sessionBarGroups(bar).map((lines) => pluginCard(lines, bar)) : [];

export function sessionBarGroups({ shown, hidden }: SessionBarProps): Lines[] {
  const grouped = new Map<string, Lines>();

  for (const entry of [shown, ...hidden]) {
    const entries = grouped.get(entry.pluginId);

    if (entries) entries.push(entry);
    else grouped.set(entry.pluginId, [entry]);
  }

  return [...grouped.values()];
}

// A card of several lines, or of one that has a menu, lists its lines as rows so each can carry its "…".
const pluginCard = (
  [first, ...rest]: Lines,
  handlers: Handlers,
): WorkbenchSection =>
  rest.length === 0 && !hasMenu(first, handlers)
    ? lineCard(first, handlers)
    : {
        ...lineCard(first, handlers),
        onOpen: undefined,
        noRows: false,
        summary: <CardLines lines={[first, ...rest]} {...handlers} />,
      };

const hasMenu = (entry: SessionBarEntry, { onDetach }: Handlers): boolean =>
  Boolean(entry.detach && onDetach);

// Loose rows, not a Section: a Section ends with a gap, which would sit under the card's last line.
function CardLines({
  lines,
  ...handlers
}: Handlers & { lines: Lines }): ReactNode {
  return (
    <List appearance="plain" density="compact" padding={0} fit>
      {lines.map((entry) => (
        <BarRow key={rowKey(entry)} entry={entry} {...handlers} />
      ))}
    </List>
  );
}

function BarRow({ entry, onOpen, onDetach }: RowProps): ReactNode {
  return (
    <ListItem
      title={entry.text}
      leading={
        entry.icon && <Icon name={entry.icon} tone={entry.tone ?? 'muted'} />
      }
      accessibilityLabel={`${openLabel(entry)}: ${entry.text}`}
      onPress={openRow(entry, onOpen)}
      trailingAccessories={<LineMenu entry={entry} onDetach={onDetach} />}
    />
  );
}

const detachAction = (onPress: () => void): MenuAction => ({
  label: 'Detach from Session',
  icon: 'close',
  onPress,
});

// The line's …, which holds the one item a Plugin's `detach` gives it; a line with none, or no handler, has no menu.
function LineMenu({
  entry,
  onDetach,
}: Pick<RowProps, 'entry' | 'onDetach'>): ReactNode {
  if (!entry.detach || !onDetach) return null;

  return (
    <Menu
      accessibilityLabel={`Actions for ${entry.text}`}
      align="end"
      trigger={<MenuTrigger label="Actions" icon="more" iconOnly />}
      actions={[detachAction(() => onDetach(entry))]}
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
