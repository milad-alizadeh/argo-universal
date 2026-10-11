import {
  SegmentedButton,
  SingleChoiceSegmentedButtonRow,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { type NativeColors, useNativeTheme } from '#lib/generic/native-theme';
import { SegmentedControlHost } from './segmented-control-host.native';
import type { SegmentedControlProps } from './segmented-control-props';

type SegmentProps<Value extends string> = Pick<
  SegmentedControlProps<Value>,
  'value' | 'onValueChange' | 'disabled'
> & {
  choice: SegmentedControlProps<Value>['choices'][number];
};

export function SegmentedControl<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.JSX.Element {
  return (
    <SegmentedControlHost>
      <SingleChoiceSegmentedButtonRow {...rowProps(props)} />
    </SegmentedControlHost>
  );
}

function rowProps<Value extends string>(
  props: SegmentedControlProps<Value>,
): React.ComponentProps<typeof SingleChoiceSegmentedButtonRow> {
  return {
    modifiers: rowModifiers(props.accessibilityLabel),
    children: props.choices.map((choice) => (
      <Segment key={choice.value} {...props} choice={choice} />
    )),
  };
}

function rowModifiers(label: string): ReturnType<typeof semantics>[] {
  return [fillMaxWidth(), semantics({ contentDescription: label })];
}

function Segment<Value extends string>(
  props: SegmentProps<Value>,
): React.JSX.Element {
  return (
    <SegmentedButton {...useSegmentProps(props)}>
      <SegmentedButton.Label>
        <Text>{props.choice.label}</Text>
      </SegmentedButton.Label>
    </SegmentedButton>
  );
}

function useSegmentProps<Value extends string>(
  props: SegmentProps<Value>,
): React.ComponentProps<typeof SegmentedButton> {
  const { colors } = useNativeTheme();
  return {
    selected: props.choice.value === props.value,
    onClick: () => props.onValueChange(props.choice.value),
    enabled: !props.disabled,
    colors: segmentColors(colors),
    modifiers: [weight(1)],
  };
}

function segmentColors(
  colors: NativeColors,
): React.ComponentProps<typeof SegmentedButton>['colors'] {
  return {
    activeContainerColor: colors.muted,
    activeContentColor: colors.foreground,
    inactiveContainerColor: colors.background,
    inactiveContentColor: colors.foreground,
    activeBorderColor: colors.border,
    inactiveBorderColor: colors.border,
  };
}
