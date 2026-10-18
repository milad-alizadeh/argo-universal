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
} from '@repo/contracts/plugins/kit';
import { Button } from '#primitives/actions/button';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Pill } from '#primitives/status/pill';
import { ProgressBar } from '#primitives/status/progress-bar';
import { Svg } from '#primitives/visual';
import type { PluginPart } from './plugin-parts';
import {
  entry,
  handlerOf,
  payloadHandler,
  type Entry,
} from './plugin-rendering';
import { pluginSettingsEntries } from './plugin-settings-entries';

export const pluginEntries = {
  ...pluginSettingsEntries,
  List: entry(contentListProps, (props, context, children) => (
    <List {...props} empty={context.slots.empty}>
      {children}
    </List>
  )),
  'List.Section': entry(
    listSectionProps,
    ({ onSelectionChange, ...props }, context, children) => (
      <ListSection
        {...props}
        leading={context.slots.leading}
        trailing={context.slots.trailing}
        onSelectionChange={payloadHandler(
          onSelectionChange,
          context,
          (payload: string[]) => ({ event: 'onSelectionChange', payload }),
        )}
      >
        {children}
      </ListSection>
    ),
  ),
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
    <ListItem
      title={props.label}
      value={props.value}
      disabled={props.disabled}
      leading={context.slots.leading}
      trailing={context.slots.accessories}
      meta={context.slots.footer ?? context.slots.detail}
      onPress={handlerOf(props.onPress, context)}
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
