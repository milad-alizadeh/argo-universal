import { VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { FieldInput } from './field-input-view.ios';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';
import { StandaloneNativeField } from './standalone-native-field';

export function StandaloneFieldInput(
  props: StandaloneFieldInputProps,
): ReactElement {
  return (
    <StandaloneNativeField {...props}>
      <NativeRow {...props} />
    </StandaloneNativeField>
  );
}

function NativeRow(props: StandaloneFieldInputProps): ReactElement {
  const modifiers = useRowModifiers();

  return (
    <VStack modifiers={modifiers}>
      <FieldInput
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
    padding({ horizontal: 16, vertical: 12 }),
    frame({ minHeight: 52, maxWidth: Infinity }),
    background(muted ?? 'transparent'),
    cornerRadius(rowRadius),
  ];
}
