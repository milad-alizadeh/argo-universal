import { VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useWide } from '../../../use-wide/use-wide';
import { Host } from '../../native/host';
import { FieldInput } from './field-input-view.ios';
import { StandaloneField } from './standalone-field';
import type { StandaloneFieldInputProps } from './standalone-field-input-props';
import { StandaloneFieldInput as WebField } from './standalone-field-input.tsx';

export function StandaloneFieldInput(
  props: StandaloneFieldInputProps,
): ReactElement {
  const wide = useWide();
  const modifiers = useRowModifiers();
  if (wide) return <WebField {...props} />;
  return (
    <StandaloneField {...props}>
      <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
        <VStack modifiers={modifiers}>
          <FieldInput
            {...props}
            label={props.required ? `${props.label} *` : props.label}
          />
        </VStack>
      </Host>
    </StandaloneField>
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
