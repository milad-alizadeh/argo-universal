import { Label } from '@repo/kit/primitives/content/label';
import {
  ListItemInert,
  useListItemPress,
} from '@repo/kit/primitives/lists/list-item';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Pressable } from 'react-native';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import type {
  OpenPluginItemPage,
  SessionRowPluginItem,
} from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

export interface SessionRowItemProps {
  plugin: SessionRowPluginItem;
  onOpenPluginPage?: OpenPluginItemPage;
}

/*
 * One Plugin item as Argo draws its own meta items: its icon and text in its tone. An item with a page is a link of its
 * own beside the row's press; pressing any other item presses the row, and a wide window shows its tooltip on hover.
 */
export function SessionRowItem(props: SessionRowItemProps): React.ReactNode {
  const onPress = pageOpener(props.plugin, props.onOpenPluginPage);

  if (onPress) return <ItemLink {...props} onPress={onPress} />;

  if (props.plugin.item.tooltip === undefined) return <RowPart {...props} />;

  return (
    <SizeClass
      compact={<RowPart {...props} />}
      wide={<HoverItem {...props} />}
    />
  );
}

const pagePath = ({ item }: SessionRowPluginItem): string | undefined =>
  item.action?.path;

// The Plugin page an item opens, when it has one and the row can open it.
export function pageOpener(
  plugin: SessionRowPluginItem,
  onOpenPluginPage: OpenPluginItemPage | undefined,
): (() => void) | undefined {
  const path = pagePath(plugin);

  if (path === undefined || !onOpenPluginPage) return;

  return () => onOpenPluginPage(plugin.pluginId, path);
}

// A link names its text and Plugin, and its tooltip as the hint, since a phone has no hover to show it.
const linkSpeech = ({
  item,
  pluginName,
}: SessionRowPluginItem): React.ComponentProps<typeof Pressable> => ({
  role: 'link',
  accessibilityLabel: `${item.text}, ${pluginName}`,
  accessibilityHint: item.tooltip,
});

/*
 * An element, not a component, since the Tooltip hands its handlers to the Pressable it is given; a phone has no
 * pointer to hover with, so it shows no tooltip.
 */
function ItemLink(
  props: SessionRowItemProps & { onPress: () => void },
): React.JSX.Element {
  const link = linkElement(props);
  const { tooltip } = props.plugin.item;

  if (tooltip === undefined) return link;

  return (
    <SizeClass
      compact={link}
      wide={<Tooltip label={tooltip}>{link}</Tooltip>}
    />
  );
}

const linkElement = (
  props: SessionRowItemProps & { onPress: () => void },
): React.JSX.Element => (
  <Pressable
    {...linkSpeech(props.plugin)}
    onPress={props.onPress}
    className={itemPressClass}
  >
    <ItemLabel {...props} />
  </Pressable>
);

// The tooltip's hover target: no stop for the keyboard, and pressing it presses the row.
function HoverItem(props: SessionRowItemProps): React.JSX.Element {
  return (
    <Tooltip label={props.plugin.item.tooltip ?? ''}>
      <Pressable
        focusable={false}
        tabIndex={-1}
        onPress={useListItemPress()}
        className={itemClass}
      >
        <ItemLabel {...props} />
      </Pressable>
    </Tooltip>
  );
}

// An item with nothing of its own to do presses the row, so a tap opens the Session and a long press can move it.
function RowPart(props: SessionRowItemProps): React.JSX.Element {
  return (
    <ListItemInert>
      <ItemLabel {...props} />
    </ListItemInert>
  );
}

// An item gives up its width before the row's title does, its text truncating.
const itemClass = 'min-w-0 shrink';

// A pressable part of the row's meta line: its tint on hover and keyboard focus, in the row's control radius.
export const pressTint =
  'rounded-control web:hover:bg-hover web:focus-visible:bg-hover';

const itemPressClass = `${itemClass} ${pressTint}`;

function ItemLabel({
  plugin: { item },
}: SessionRowItemProps): React.JSX.Element {
  return (
    <Label
      icon={item.icon && pluginSymbol(item.icon)}
      text={item.text}
      tone={item.tone}
      sidebar={sidebarRows}
      shrinks
    />
  );
}
