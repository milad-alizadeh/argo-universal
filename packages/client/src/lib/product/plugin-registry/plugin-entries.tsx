import {
  actionListProps,
  actionProps,
  actionSectionProps,
} from '@repo/contracts/plugins/action-list-props';
import {
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
  listProps,
  buttonProps,
  layoutProps,
  textForApp,
  groupedItemProps,
  stackProps,
  svgProps,
  emptyStateProps,
} from '@repo/contracts/plugins/kit';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { ActionList, Action } from '#primitives/actions/action-list';
import { Button } from '#primitives/actions/button';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { StandaloneGroupedListItem } from '#primitives/lists/grouped-list-item';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { EmptyState } from '#primitives/status/empty-state';
import { Pill } from '#primitives/status/pill';
import { ProgressBar } from '#primitives/status/progress-bar';
import { Svg } from '#primitives/visual';
import type { PluginPart } from './plugin-parts';
import { entry, handlerOf, type Entry } from './plugin-rendering';

export const pluginEntries = {
  ActionList: entry(actionListProps, (props, context, children) => (
    <ActionList {...props} plugin trigger={context.slots.trigger}>
      {children}
    </ActionList>
  )),
  'ActionList.Section': entry(
    actionSectionProps,
    (props, _context, children) => (
      <ActionList.Section {...props}>{children}</ActionList.Section>
    ),
  ),
  Action: entry(actionProps, ({ onPress, ...props }, context) => (
    <Action {...props} onPress={handlerOf(onPress, context) ?? noAction} />
  )),
  EmptyState: entry(emptyStateProps, (props, context) => (
    <EmptyState {...props} action={context.slots.action} />
  )),
  List: entry(contentListProps, (props, context, children) => (
    <List {...props} empty={context.slots.empty}>
      {children}
    </List>
  )),
  'List.Section': entry(listSectionProps, (props, context, children) => (
    <ListSection
      {...props}
      leading={context.slots.leading}
      trailing={context.slots.trailing}
    >
      {children}
    </ListSection>
  )),
  ListItem: entry(listItemProps, ({ onPress, ...props }, context) => (
    <ListItem
      {...props}
      leading={context.slots.leading}
      trailing={context.slots.trailing}
      meta={context.slots.meta}
      onPress={handlerOf(onPress, context)}
    />
  )),
  Label: entry(labelProps, (props) => <Label {...props} />),
  ProgressBar: entry(progressBarProps, (props) => <ProgressBar {...props} />),
  Pill: entry(pillProps, (props) => <Pill {...props} />),
  VirtualList: entry(listProps, (_props, _context, children) => (
    <List appearance="plain">{children}</List>
  )),
  GroupedList: entry(listProps, (_props, _context, children) => (
    <List appearance="grouped">{children}</List>
  )),
  GroupedListItem: entry(groupedItemProps, (props, context) => (
    <StandaloneGroupedListItem
      {...props}
      onPress={handlerOf(props.onPress, context)}
      leading={contentSlot(context.slots.leading)}
      leadingLayout="content"
      accessory={contentSlot(context.slots.accessories)}
      footer={context.slots.footer}
      detail={context.slots.detail}
    />
  )),
  Text: entry(textForApp, (props) => <Text {...props} />),
  Button: entry(buttonProps, ({ onPress, ...props }, context) => (
    <Button {...props} onPress={handlerOf(onPress, context)} />
  )),
  Stack: entry(stackProps, ({ direction, ...props }, _context, children) => (
    <Stack direction={direction} {...props}>
      {children}
    </Stack>
  )),
  Row: entry(layoutProps, (props, _context, children) => (
    <Stack direction="row" {...props}>
      {children}
    </Stack>
  )),
  Column: entry(layoutProps, (props, _context, children) => (
    <Stack direction="column" {...props}>
      {children}
    </Stack>
  )),
  Svg: entry(svgProps, ({ onPress, ...props }, context) => (
    <Svg {...props} onPress={handlerOf(onPress, context)} />
  )),
} satisfies Record<PluginPart, Entry>;

// A native RNHostView measures one hosted View, including every node in the Slot.
function contentSlot(slot: ReactElement | undefined): ReactElement | undefined {
  return slot ? <View className="self-start">{slot}</View> : undefined;
}

function noAction(): void {}
