import { Checkbox, RadioButton } from '@expo/ui/jetpack-compose';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
/* oxlint-disable-next-line no-restricted-imports -- the Android-only drawing stays out of the folder's index so the web never loads Compose. */
import {
  RowListItem,
  toggling,
} from '../field-row/field-row-list-item.android';
import {
  optionChoice,
  type OptionRowProps,
} from './field-picker-inline-choice';

/*
 * One option as a Material ListItem, as Compose Settings draws a choice: the title, the subtitle as its supporting
 * line, and a trailing RadioButton (a Checkbox when `multiple`). The whole row toggles, with the matching role.
 */
export function OptionRow(props: OptionRowProps): ReactElement {
  const choice = optionChoice(props);
  const { option, disabled } = props;

  return (
    <RowListItem
      title={option.label}
      leading={option.icon}
      disabled={disabled}
      supporting={supporting(option.subtitle)}
      trailing={<Mark {...props} selected={choice.selected} />}
      modifiers={toggles(props, choice)}
    />
  );
}

const toggles = (
  props: OptionRowProps,
  choice: ReturnType<typeof optionChoice>,
): ReturnType<typeof toggling> =>
  toggling(
    {
      value: choice.selected,
      onValueChange: choice.toggle,
      disabled: props.disabled,
    },
    role(props),
  );

const role = (props: OptionRowProps): 'checkbox' | 'radioButton' =>
  props.multiple ? 'checkbox' : 'radioButton';

function Mark(props: OptionRowProps & { selected: boolean }): ReactElement {
  const enabled = !props.disabled;

  return props.multiple ? (
    <Checkbox value={props.selected} enabled={enabled} />
  ) : (
    <RadioButton selected={props.selected} enabled={enabled} />
  );
}

function supporting(subtitle: string | undefined): ReactElement | undefined {
  if (!subtitle) return undefined;

  return (
    <NativeText role="secondary" tone="muted">
      {subtitle}
    </NativeText>
  );
}
