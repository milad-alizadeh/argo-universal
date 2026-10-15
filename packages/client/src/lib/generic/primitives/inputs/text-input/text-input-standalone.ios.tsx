import { VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ComponentType, ReactElement } from 'react';
import { useNativeTheme } from '../../../native-theme';
import type { StandaloneTextInputProps } from './text-input-props';
import { RowTextInput } from './text-input-row.ios';
import { StandaloneNativeField } from './text-input-standalone-native';

export function StandaloneTextInput(
  props: StandaloneTextInputProps,
): ReactElement {
  return (
    <StandaloneNativeField {...props}>
      <NativeRow {...props} />
    </StandaloneNativeField>
  );
}

function NativeRow(props: StandaloneTextInputProps): ReactElement {
  const modifiers = useRowModifiers();

  return (
    <VStack modifiers={modifiers}>
      <RowTextInput
        {...props}
        label={props.required ? `${props.label} *` : props.label}
      />
    </VStack>
  );
}

const rowRadius = 24;

function useRowModifiers(): NonNullable<
  React.ComponentProps<typeof VStack>['modifiers']
> {
  const { muted } = useNativeTheme().colors;

  return [
    // The row inside already stands 52pt tall, so the capsule adds no vertical padding of its own.
    padding({ horizontal: 16 }),
    frame({ minHeight: 52, maxWidth: Infinity }),
    background(muted ?? 'transparent'),
    cornerRadius(rowRadius),
  ];
}

StandaloneTextInput satisfies ComponentType<StandaloneTextInputProps>;
