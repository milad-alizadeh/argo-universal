import {
  listLinkProps,
  listToggleProps,
  listPickerProps,
  listStepperProps,
  listTextFieldProps,
  listButtonProps,
} from '@repo/contracts/plugins/kit';
import { ListItem } from '#primitives/lists/list-item';
import type { RenderContext } from './plugin-rendering';
import {
  entry,
  handlerOf,
  valueChangeHandler,
  textChangeHandler,
} from './plugin-rendering';

export const pluginSettingsEntries = {
  'ListItem.Link': entry(listLinkProps, ({ onPress, ...props }, context) => (
    <ListItem.Link
      {...props}
      leading={context.slots.leading}
      onPress={handlerOf(onPress, context)}
    />
  )),
  'ListItem.Button': entry(
    listButtonProps,
    ({ onPress, ...props }, context) => (
      <ListItem.Button
        {...props}
        leading={context.slots.leading}
        onPress={handlerOf(onPress, context)}
      />
    ),
  ),
  'ListItem.Toggle': entry(
    listToggleProps,
    ({ onValueChange, ...props }, context) => (
      <ListItem.Toggle
        {...props}
        leading={context.slots.leading}
        onValueChange={valueChangeHandler(onValueChange, context)}
      />
    ),
  ),
  'ListItem.Picker': entry(
    listPickerProps,
    ({ onValueChange, ...props }, context) => (
      <ListItem.Picker
        {...props}
        leading={context.slots.leading}
        onValueChange={valueChangeHandler(onValueChange, context)}
      />
    ),
  ),
  'ListItem.Stepper': entry(
    listStepperProps,
    ({ onValueChange, ...props }, context) => (
      <ListItem.Stepper
        {...props}
        leading={context.slots.leading}
        onValueChange={valueChangeHandler(onValueChange, context)}
      />
    ),
  ),
  'ListItem.TextField': entry(
    listTextFieldProps,
    ({ onChangeText, onSubmit, ...props }, context) => (
      <ListItem.TextField
        {...props}
        value={draftValue(context, props.value)}
        onChangeText={textChangeHandler(onChangeText, context)}
        onSubmit={handlerOf(onSubmit, context, 'onSubmit')}
      />
    ),
  ),
};

function draftValue(context: RenderContext, fallback: string): string {
  const draft = context.ui.state.get(context.key)?.draft;

  return typeof draft === 'string' ? draft : fallback;
}
