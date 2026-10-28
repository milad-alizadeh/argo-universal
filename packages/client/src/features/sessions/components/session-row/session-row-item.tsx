import { Label } from '@repo/kit/primitives/content/label';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import type { OpenPluginPage, SessionRowPluginItem } from './session-row-props';
import { sidebarRows } from './session-row-sidebar';

export interface SessionRowItemProps {
  plugin: SessionRowPluginItem;
  onOpenPluginPage?: OpenPluginPage;
}

/*
 * One Plugin item as Argo draws its own meta items: its icon and text in its tone. Its tooltip shows on hover where
 * there is a pointer, and pressing an item with an action opens that Plugin's page instead of the row's Session.
 */
export function SessionRowItem(props: SessionRowItemProps): React.ReactNode {
  const onPress = pageOpener(props.plugin, props.onOpenPluginPage);
  const { tooltip } = props.plugin.item;

  if (!onPress && tooltip === undefined) return <ItemLabel {...props} />;

  return withTooltip(tooltip, pressableItem(props, onPress));
}

// A wide window shows the item's tooltip on hover; a phone has no pointer to hover with.
function withTooltip(
  tooltip: string | undefined,
  pressable: React.JSX.Element,
): React.JSX.Element {
  if (tooltip === undefined) return pressable;

  return (
    <SizeClass
      compact={pressable}
      wide={<Tooltip label={tooltip}>{pressable}</Tooltip>}
    />
  );
}

const pagePath = ({ item }: SessionRowPluginItem): string | undefined =>
  item.action?.path;

// The Plugin page an item opens, when it has one and the row can open it.
export function pageOpener(
  plugin: SessionRowPluginItem,
  onOpenPluginPage: OpenPluginPage | undefined,
): (() => void) | undefined {
  const path = pagePath(plugin);

  if (path === undefined || !onOpenPluginPage) return;

  return () => onOpenPluginPage(plugin.pluginId, path);
}

/*
 * The item as its own part of the row: the tooltip's hover target, and the link to its Plugin's page when it has one.
 * An element, not a component, since the Tooltip hands its handlers to the Pressable it is given.
 */
function pressableItem(
  props: SessionRowItemProps,
  onPress: (() => void) | undefined,
): React.JSX.Element {
  return (
    <Pressable
      {...itemSpeech(props.plugin, onPress)}
      onPress={onPress}
      className={itemPressClass}
    >
      <ItemLabel {...props} />
    </Pressable>
  );
}

// A link names its text and Plugin, and its tooltip as the hint, since a phone has no hover to show it.
const itemSpeech = (
  { item, pluginName }: SessionRowPluginItem,
  onPress: (() => void) | undefined,
): Pick<
  PressableProps,
  'role' | 'accessibilityLabel' | 'accessibilityHint'
> => ({
  role: onPress && 'link',
  accessibilityLabel: `${item.text}, ${pluginName}`,
  accessibilityHint: item.tooltip,
});

// A pressable meta item: its tint on hover and keyboard focus, in the row's control radius.
export const itemPressClass =
  'shrink-0 rounded-control web:hover:bg-hover web:focus-visible:bg-hover';

function ItemLabel({
  plugin: { item },
}: SessionRowItemProps): React.JSX.Element {
  return (
    <Label
      icon={item.icon && pluginSymbol(item.icon)}
      text={item.text}
      tone={item.tone}
      sidebar={sidebarRows}
    />
  );
}
