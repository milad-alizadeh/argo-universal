import { Icon } from '@repo/kit/primitives/content/icon';
import { Label } from '@repo/kit/primitives/content/label';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  usePopoverClose,
} from '@repo/kit/primitives/overlays/popover';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Pressable } from 'react-native';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import { SecondaryChangeStageIcon } from '../change-stage/change-stage';
import { changeState, pageOpener, pressTint } from './session-row-item';
import type {
  OpenPluginItemPage,
  SessionRowPluginItem,
} from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

// One part of the row as "+N" lists it: what it reads, its glyph, where it came from, and the page it opens.
export interface MoreEntry {
  key: string;
  text: string;
  leading?: React.ReactNode;
  // The Plugin an item came from, or what Argo's own part counts, such as Agents.
  source?: string;
  onOpen?: () => void;
}

export interface SessionRowMoreProps {
  more: readonly MoreEntry[];
}

const moreTitle = (count: number): string => `${count} more on this Session`;

const moreLabel = (count: number): string =>
  `${count} more ${count === 1 ? 'item' : 'items'}`;

/*
 * "+N", always last on a row's meta line (ADR-0035): it lists every part of the row that did not fit, Argo's and the
 * Plugins', each with where it came from, in a popover a pointer opens on hover and a sheet on a phone. A part with a
 * page opens it from there.
 */
export function SessionRowMore(props: SessionRowMoreProps): React.ReactNode {
  const count = props.more.length;

  if (!count) return null;

  return (
    <Popover openOnHover>
      <MoreTrigger count={count} />
      <PopoverContent align="start" accessibilityLabel={moreTitle(count)} list>
        <PopoverTitle>{moreTitle(count)}</PopoverTitle>
        <MoreList {...props} />
      </PopoverContent>
    </Popover>
  );
}

function MoreTrigger({ count }: { count: number }): React.JSX.Element {
  return (
    <PopoverTrigger>
      <Pressable
        accessibilityLabel={moreLabel(count)}
        aria-haspopup="dialog"
        className={`shrink-0 ${pressTint}`}
      >
        <Label text={`+${count}`} sidebar={sidebarRows} />
      </Pressable>
    </PopoverTrigger>
  );
}

function MoreList(props: SessionRowMoreProps): React.JSX.Element {
  const close = usePopoverClose();

  return (
    <List appearance="plain" fit>
      <ListSection>
        {props.more.map((entry) => (
          <MoreRow key={entry.key} entry={entry} close={close} />
        ))}
      </ListSection>
    </List>
  );
}

// An item's page opens once the popover has closed.
const closing = (
  close: () => void,
  open: (() => void) | undefined,
): (() => void) | undefined =>
  open &&
  ((): void => {
    close();
    open();
  });

interface MoreRowProps {
  entry: MoreEntry;
  close: () => void;
}

function moreRow({
  entry,
  close,
}: MoreRowProps): Omit<ListItemProps, 'subtitle' | 'value'> {
  const onOpen = closing(close, entry.onOpen);

  return {
    title: entry.text,
    leading: entry.leading,
    onPress: onOpen,
    disclosure: onOpen !== undefined,
  };
}

// A desktop popover ends the row with where the part came from; a phone sheet puts it under the text.
function MoreRow(props: MoreRowProps): React.JSX.Element {
  const row = moreRow(props);
  const { source } = props.entry;

  return (
    <SizeClass
      compact={<ListItem {...row} subtitle={source} />}
      wide={<ListItem {...row} value={source} />}
    />
  );
}

// As on the line: a pull request's Change stage mark, else the item's glyph in its tone.
function itemLeading({
  icon,
  tone,
  change,
}: SessionRowPluginItem['item']): React.ReactNode {
  if (change) return <SecondaryChangeStageIcon {...changeState(change)} />;

  return icon && <Icon name={pluginSymbol(icon)} tone={tone} />;
}

// A Plugin item as "+N" lists it: its glyph, its text, and its Plugin's name.
export function pluginEntry(
  plugin: SessionRowPluginItem,
  onOpenPluginPage: OpenPluginItemPage | undefined,
): MoreEntry {
  return {
    key: plugin.key,
    text: plugin.item.text,
    leading: itemLeading(plugin.item),
    source: plugin.pluginName,
    onOpen: pageOpener(plugin, onOpenPluginPage),
  };
}

// Plugin items as "+N" lists them, each opening its page when it has one.
export const pluginEntries = (
  plugins: readonly SessionRowPluginItem[],
  onOpenPluginPage: OpenPluginItemPage | undefined,
): MoreEntry[] =>
  plugins.map((plugin) => pluginEntry(plugin, onOpenPluginPage));
