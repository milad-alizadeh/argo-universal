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
  PopoverTrigger,
  usePopoverClose,
} from '@repo/kit/primitives/overlays/popover';
import type * as React from 'react';
import { Pressable } from 'react-native';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import { SecondaryChangeStageIcon } from '../change-stage/change-stage';
import { changeState, pageOpener, pressTint } from './session-row-item';
import type {
  OpenPluginItemPage,
  SessionRowPluginItem,
} from './session-row-props';
import { useSidebarRows } from './session-row-sidebar';

// One part of the row as "+N" lists it: its glyph, what it reads, and the page it opens.
export interface MoreEntry {
  key: string;
  text: string;
  leading?: React.ReactNode;
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
 * Plugins', each as its glyph and text, in a popover a pointer opens on hover and a sheet on a phone. A part with a
 * page opens it from there.
 */
export function SessionRowMore(props: SessionRowMoreProps): React.ReactNode {
  const count = props.more.length;

  if (!count) return null;

  return (
    <Popover openOnHover>
      <MoreTrigger count={count} />
      <PopoverContent align="start" accessibilityLabel={moreTitle(count)} list>
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
        <MoreCount count={count} />
      </Pressable>
    </PopoverTrigger>
  );
}

// How "+N" reads on the line; a row measures it alone, without the popover it opens.
export function MoreCount({ count }: { count: number }): React.JSX.Element {
  return <Label text={`+${count}`} sidebar={useSidebarRows()} />;
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

function moreRow({ entry, close }: MoreRowProps): ListItemProps {
  const onOpen = closing(close, entry.onOpen);

  return {
    title: entry.text,
    leading: entry.leading,
    onPress: onOpen,
    disclosure: onOpen !== undefined,
  };
}

// Each part as its glyph and text alone, as the line draws it.
function MoreRow(props: MoreRowProps): React.JSX.Element {
  return <ListItem {...moreRow(props)} />;
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
    onOpen: pageOpener(plugin, onOpenPluginPage),
  };
}

// Plugin items as "+N" lists them, each opening its page when it has one.
export const pluginEntries = (
  plugins: readonly SessionRowPluginItem[],
  onOpenPluginPage: OpenPluginItemPage | undefined,
): MoreEntry[] =>
  plugins.map((plugin) => pluginEntry(plugin, onOpenPluginPage));
