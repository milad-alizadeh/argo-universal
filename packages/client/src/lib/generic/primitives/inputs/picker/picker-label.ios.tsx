import { Text } from '@expo/ui/swift-ui';
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
  disabled,
  foregroundStyle,
  frame,
  pickerStyle,
} from '@expo/ui/swift-ui/modifiers';
import { errorMessage } from '#primitives/fields/field-errors';
import { optionalTint } from '#primitives/native/native-modifiers';
import { useSwiftUITextModifiers } from '#primitives/native/native-typography';
import { useNativeTheme } from '../../../native-theme';
import type { PickerProps } from './picker-props';
import { pickerLabel, pickerValue } from './picker-selection';

const rowHeight = 44;

export function PickerLabel(
  props: Pick<PickerProps<string>, 'label' | 'invalid' | 'required'>,
): React.JSX.Element {
  const { foreground, destructive } = useNativeTheme().colors;
  const modifiers = useSwiftUITextModifiers('body', 'row');
  const color = (props.invalid ? destructive : foreground) ?? 'primary';

  return (
    <Text modifiers={[...modifiers, foregroundStyle(color)]}>
      {pickerLabel(props)}
    </Text>
  );
}

export function PickerValue<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <Text modifiers={usePickerValueModifiers()}>{pickerValue(props)}</Text>
  );
}

function usePickerValueModifiers(): ReturnType<typeof foregroundStyle>[] {
  const { mutedForeground } = useNativeTheme().colors;
  const modifiers = useSwiftUITextModifiers('body', 'row');

  return [...modifiers, foregroundStyle(mutedForeground ?? 'secondary')];
}

export function usePickerModifiers<Value extends string>(
  props: PickerProps<Value>,
): ReturnType<typeof pickerStyle>[] {
  const colors = useNativeTheme().colors;

  return [
    frame({ minHeight: rowHeight }),
    accessibilityLabel(props.label),
    accessibilityValue(pickerValue(props)),
    accessibilityHint(pickerHint(props)),
    disabled(props.disabled),
    ...optionalTint(props.invalid ? colors.destructive : colors.tint),
  ];
}

function pickerHint(
  props: Pick<PickerProps<string>, 'errors' | 'hint'>,
): string {
  return errorMessage(props.errors ?? []) ?? hintText(props.hint);
}

function hintText(hint?: string): string {
  return hint ?? '';
}
