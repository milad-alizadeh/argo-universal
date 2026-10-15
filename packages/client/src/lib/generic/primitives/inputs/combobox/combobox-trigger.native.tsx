// The native field keeps its platform label and value drawing around a stock button.
import { Button, Row, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import type { FieldDescription } from '#primitives/fields/field-description';
import { ChoiceField, ChoiceHost } from '#primitives/native/choice-field';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { ComboboxProps } from './combobox-props';
import { comboboxValue, type ChoiceValue } from './combobox-value';

type TriggerProps<Value extends string> = ComboboxProps<Value> &
  FieldDescription & { onPress?: () => void };

type NamedValue = ChoiceValue & { label: string; description?: string };

export function ComboboxTrigger<Value extends string>(
  props: TriggerProps<Value>,
): ReactElement {
  return (
    <ChoiceHost>
      {createElement(
        Button,
        buttonProps(props),
        <ChoiceField {...props}>
          <TriggerValue {...props} />
        </ChoiceField>,
      )}
    </ChoiceHost>
  );
}

function buttonProps<Value extends string>(
  props: TriggerProps<Value>,
): React.ComponentProps<typeof Button> {
  return {
    variant: 'text',
    onPress: props.onPress,
    disabled: props.disabled,
    modifiers: triggerModifiers(props),
  };
}

function TriggerValue(props: ChoiceValue): ReactElement {
  return (
    <Row alignment="center" spacing={6}>
      <Text textStyle={useUniversalTextStyle('body')}>
        {comboboxValue(props)}
      </Text>
      <NativeSymbol name="chevron-up-down" role="body" />
    </Row>
  );
}

function triggerModifiers(
  props: NamedValue,
): React.ComponentProps<typeof Button>['modifiers'] {
  if (Platform.OS !== 'ios')
    return [
      semantics({
        contentDescription: `${props.label}, ${comboboxValue(props)}`,
      }),
    ];

  return [
    accessibilityLabel(props.label),
    accessibilityValue(comboboxValue(props)),
    accessibilityHint(props.description ?? ''),
  ];
}
