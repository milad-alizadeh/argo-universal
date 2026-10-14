import { Text } from '@expo/ui/swift-ui';
import { disabled, tag } from '@expo/ui/swift-ui/modifiers';
import { menuTag } from './picker-menu-tags';
import type { PickerProps } from './picker-props';
import {
  pickerOption,
  pickerOptionsMessage,
  pickerValue,
} from './picker-selection';

export function MenuOptions<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  const message = pickerOptionsMessage(props);

  return (
    <>
      <MenuPlaceholder {...props} />
      {message ? (
        <Text modifiers={[disabled(true)]}>{message}</Text>
      ) : (
        <MenuChoices {...props} />
      )}
    </>
  );
}

function MenuPlaceholder<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element | null {
  if (pickerOption(props)) return null;

  return (
    <Text modifiers={[tag('placeholder'), disabled(true)]}>
      {pickerValue(props)}
    </Text>
  );
}

function MenuChoices<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <>
      {props.options.map((option) => (
        <MenuChoice key={option.value} option={option} />
      ))}
    </>
  );
}

function MenuChoice(props: {
  option: { value: string; label: string; disabled?: boolean };
}): React.JSX.Element {
  return (
    <Text
      modifiers={[
        tag(menuTag(props.option.value)),
        disabled(props.option.disabled),
      ]}
    >
      {props.option.label}
    </Text>
  );
}
