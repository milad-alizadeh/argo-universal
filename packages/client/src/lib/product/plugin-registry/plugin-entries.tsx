import { wireParts } from '@repo/contracts/plugins/kit';
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
import type { Handler } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import { Label } from '#primitives/content/label';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { EmptyState } from '#primitives/status/empty-state';
import { Pill } from '#primitives/status/pill';
import { ProgressBar } from '#primitives/status/progress-bar';
import { Svg } from '#primitives/visual';
import {
  PluginButton,
  PluginIconButton,
  PluginSplitButton,
} from './plugin-buttons';
import {
  PluginPicker,
  PluginSlider,
  PluginTextInput,
  PluginBinaryControl,
} from './plugin-inputs';
import type { PluginPart } from './plugin-parts';
import {
  entry,
  handlerOf,
  payloadHandler,
  type Entry,
  type RenderContext,
} from './plugin-rendering';
import { pluginSettingsEntries } from './plugin-settings-entries';

export const pluginEntries = {
  ...pluginSettingsEntries,
  EmptyState: entry(emptyStateProps, (props, context) => (
    <EmptyState {...props} action={context.slots.action} />
  )),
  Picker: entry(wireParts.Picker.props, (props, context) => (
    <PluginPicker props={props} context={context} />
  )),
  Slider: entry(wireParts.Slider.props, (props, context) => (
    <PluginSlider props={props} context={context} />
  )),
  TextInput: entry(wireParts.TextInput.props, (props, context) => (
    <PluginTextInput props={props} context={context} />
  )),
  IconButton: entry(wireParts.IconButton.props, (props, context) => (
    <PluginIconButton props={props} context={context} />
  )),
  SplitButton: entry(wireParts.SplitButton.props, (props, context) => (
    <PluginSplitButton props={props} context={context} />
  )),
  Switch: entry(wireParts.Switch.props, (props, context) => (
    <PluginBinaryControl type="Switch" props={props} context={context} />
  )),
  Checkbox: entry(wireParts.Checkbox.props, (props, context) => (
    <PluginBinaryControl type="Checkbox" props={props} context={context} />
  )),
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
        selection={
          context.ui.state.get(context.key)?.selection ?? props.selection
        }
        leading={context.slots.leading}
        trailing={context.slots.trailing}
        onSelectionChange={sectionChange(onSelectionChange, context)}
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
      meta={legacyMeta(context)}
      onPress={handlerOf(props.onPress, context)}
    />
  )),
  Text: entry(textForApp, (props) => <Text {...props} />),
  Button: entry(buttonProps, (props, context) => (
    <PluginButton props={props} context={context} />
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

function legacyMeta({ slots }: RenderContext): ReactNode {
  if (!slots.detail && !slots.footer) return undefined;

  return (
    <Stack direction="column">
      {slots.detail}
      {slots.footer}
    </Stack>
  );
}

function sectionChange(
  handler: Handler | undefined,
  context: RenderContext,
): ((payload: string[]) => void) | undefined {
  return payloadHandler(handler, context, (payload: string[]) => ({
    event: 'onSelectionChange',
    payload,
  }));
}
