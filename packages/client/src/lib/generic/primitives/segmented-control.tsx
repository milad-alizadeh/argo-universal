import ExpoSegmentedControl from '@expo/ui/community/segmented-control';
import type * as React from 'react';
import { View } from 'react-native';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { SegmentedControlProps } from './segmented-control-props';

export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.JSX.Element {
  const { colorScheme } = useNativeTheme();
  return (
    <View role="group" accessibilityLabel={selectionLabel(props)}>
      <ExpoSegmentedControl {...controlProps(props)} appearance={colorScheme} />
    </View>
  );
}

function selectionLabel<Value extends string>(
  props: SegmentedControlProps<Value>,
): string {
  const selected = props.choices.find((choice) => choice.value === props.value);
  return `${props.accessibilityLabel}, ${selected?.label ?? props.value}`;
}

function controlProps<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.ComponentProps<typeof ExpoSegmentedControl> {
  return {
    values: props.choices.map((choice) => choice.label),
    selectedIndex: selectedChoiceIndex(props),
    onChange: (event) =>
      selectChoice(props, event.nativeEvent.selectedSegmentIndex),
    enabled: !props.disabled,
  };
}

function selectedChoiceIndex<Value extends string>(
  props: SegmentedControlProps<Value>,
): number {
  return props.choices.findIndex((choice) => choice.value === props.value);
}

function selectChoice<Value extends string>(
  props: SegmentedControlProps<Value>,
  index: number,
): void {
  const choice = props.choices[index];
  if (choice) props.onValueChange(choice.value);
}
