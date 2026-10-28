import { Icon } from '@repo/kit/primitives/content/icon';
import { Label } from '@repo/kit/primitives/content/label';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  usePopoverClose,
} from '@repo/kit/primitives/overlays/popover';
import type * as React from 'react';
import { Pressable } from 'react-native';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import { itemPressClass, pageOpener } from './session-row-item';
import type { OpenPluginPage, SessionRowPluginItem } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

export interface SessionRowMoreProps {
  more: readonly SessionRowPluginItem[];
  onOpenPluginPage?: OpenPluginPage;
}

const moreTitle = (count: number): string => `${count} more on this Session`;

const moreLabel = (count: number): string =>
  `${count} more ${count === 1 ? 'item' : 'items'} from Plugins`;

/*
 * "+N" after a row's Plugin items (ADR-0035): pressing it lists each item that did not fit with the Plugin it came
 * from, in a popover on a desktop and a sheet on a phone. An item with a page opens it from there.
 */
export function SessionRowMore(props: SessionRowMoreProps): React.ReactNode {
  const count = props.more.length;

  if (!count) return null;

  return (
    <Popover>
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
        className={itemPressClass}
      >
        <Label text={`+${count}`} sidebar={sidebarRows} />
      </Pressable>
    </PopoverTrigger>
  );
}

function MoreList(props: SessionRowMoreProps): React.JSX.Element {
  const close = usePopoverClose();

  const open = (plugin: SessionRowPluginItem): (() => void) | undefined =>
    closing(close, pageOpener(plugin, props.onOpenPluginPage));

  return (
    <List appearance="plain" fit>
      <ListSection>
        {props.more.map((plugin) => (
          <MoreRow key={plugin.key} plugin={plugin} onOpen={open(plugin)} />
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
  plugin: SessionRowPluginItem;
  onOpen?: () => void;
}

const itemIcon = ({
  icon,
  tone,
}: SessionRowPluginItem['item']): React.ReactNode =>
  icon && <Icon name={pluginSymbol(icon)} tone={tone} />;

function MoreRow({
  plugin: { item, pluginName },
  onOpen,
}: MoreRowProps): React.JSX.Element {
  return (
    <ListItem
      title={item.text}
      subtitle={pluginName}
      leading={itemIcon(item)}
      onPress={onOpen}
    />
  );
}
