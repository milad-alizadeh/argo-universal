// The native field keeps its platform label and value drawing around a stock button in Argo's colours.
import { Row } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import {
  accessibilityHint,
  accessibilityLabel,
  accessibilityValue,
} from '@expo/ui/swift-ui/modifiers';
import { createElement, type ReactElement } from 'react';
import { Platform } from 'react-native';
import { NativeText } from '#primitives/content/native-text';
import type { FieldDescription } from '#primitives/fields/field-description';
import { ChoiceField, ChoiceHost } from '#primitives/native/choice-field';
import { NativeButton } from '#primitives/native/native-button';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type { ComboboxProps } from './combobox-props';
import type { TriggerFields } from './combobox-trigger';

type TriggerProps = TriggerFields &
  Pick<ComboboxProps<string>, 'required' | 'variant'> &
  FieldDescription & { onPress?: () => void };

export function ComboboxTrigger(props: TriggerProps): ReactElement {
  return (
    <ChoiceHost>
      {createElement(
        NativeButton,
        buttonProps(props),
        <ChoiceField {...props}>
          <TriggerValue {...props} />
        </ChoiceField>,
      )}
    </ChoiceHost>
  );
}

function buttonProps(
  props: TriggerProps,
): React.ComponentProps<typeof NativeButton> {
  return {
    variant: 'text',
    onPress: props.onPress,
    disabled: props.disabled,
    modifiers: triggerModifiers(props),
  };
}

function TriggerValue(props: TriggerFields): ReactElement {
  return (
    <Row alignment="center" spacing={6}>
      <NativeText>{props.valueLabel}</NativeText>
      <NativeSymbol name="chevron-up-down" size="sm" />
    </Row>
  );
}

function triggerModifiers(
  props: TriggerProps,
): React.ComponentProps<typeof NativeButton>['modifiers'] {
  if (Platform.OS !== 'ios')
    return [
      semantics({
        contentDescription: `${props.label}, ${props.valueLabel}`,
      }),
    ];

  return [
    accessibilityLabel(props.label),
    accessibilityValue(props.valueLabel),
    accessibilityHint(props.description ?? ''),
  ];
}
