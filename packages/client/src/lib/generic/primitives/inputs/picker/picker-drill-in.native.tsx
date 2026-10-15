// Long lists use the shared Sheet; the universal Picker handles short menus.
import { Button, Row, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import { createElement } from 'react';
import { Platform } from 'react-native';
import { errorMessage } from '#primitives/fields/field-errors';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { NativeSymbol } from '../../../symbols/native-symbol';
import { PickerNativeField, PickerNativeHost } from './picker-native-field';
import type { PickerProps } from './picker-props';
import { pickerValue } from './picker-selection';
import { PickerSheet } from './picker-sheet';

export const drillInLimit = 7;

type TriggerProps<Value extends string> = PickerProps<Value> & {
  onPress?: () => void;
};

export function PickerDrillIn<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return <PickerSheet {...props} trigger={<DrillInTrigger {...props} />} />;
}

function DrillInTrigger<Value extends string>(
  props: TriggerProps<Value>,
): React.JSX.Element {
  return (
    <PickerNativeHost>
      {createElement(
        Button,
        triggerProps(props),
        <PickerNativeField {...props}>
          <TriggerValue {...props} />
        </PickerNativeField>,
      )}
    </PickerNativeHost>
  );
}

function triggerProps<Value extends string>(
  props: TriggerProps<Value>,
): React.ComponentProps<typeof Button> {
  return {
    variant: 'text',
    onPress: props.onPress,
    disabled: props.disabled,
    modifiers: nativeTriggerModifiers(props),
  };
}

function nativeTriggerModifiers<Value extends string>(
  props: PickerProps<Value>,
): React.ComponentProps<typeof Button>['modifiers'] {
  return Platform.OS === 'ios'
    ? triggerModifiers(props)
    : [
        semantics({
          contentDescription: `${props.label}, ${pickerValue(props)}`,
        }),
      ];
}

function TriggerValue<Value extends string>(
  props: PickerProps<Value>,
): React.JSX.Element {
  return (
    <Row alignment="center" spacing={6}>
      <Text textStyle={useUniversalTextStyle('body')}>
        {pickerValue(props)}
      </Text>
      <NativeSymbol name="chevron-up-down" role="body" />
    </Row>
  );
}

function triggerModifiers<Value extends string>(
  props: PickerProps<Value>,
): ReturnType<typeof accessibilityLabel>[] {
  return [
    accessibilityLabel(props.label),
    accessibilityValue(pickerValue(props)),
    accessibilityHint(triggerHint(props)),
  ];
}

function triggerHint<Value extends string>(props: PickerProps<Value>): string {
  return errorMessage(props.errors ?? []) ?? hintText(props.hint);
}

function hintText(hint?: string): string {
  return hint ?? '';
}
