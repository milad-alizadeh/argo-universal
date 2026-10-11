import { Picker, Text } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  disabled,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { SegmentedControlHost } from './segmented-control-host.native';
import type { SegmentedControlProps } from './segmented-control-props';

export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.JSX.Element {
  return (
    <SegmentedControlHost>
      <Picker {...pickerProps(props)}>{props.choices.map(pickerChoice)}</Picker>
    </SegmentedControlHost>
  );
}

function pickerProps<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.ComponentProps<typeof Picker<Value>> {
  return {
    selection: props.value,
    onSelectionChange: props.onValueChange,
    modifiers: pickerModifiers(props),
  };
}

function pickerChoice<Value extends string>(
  choice: SegmentedControlProps<Value>['choices'][number],
): React.JSX.Element {
  return (
    <Text key={choice.value} modifiers={[tag(choice.value)]}>
      {choice.label}
    </Text>
  );
}

function pickerModifiers<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.ComponentProps<typeof Picker>['modifiers'] {
  return [
    pickerStyle('segmented'),
    disabled(!!props.disabled),
    accessibilityLabel(props.accessibilityLabel),
  ];
}
