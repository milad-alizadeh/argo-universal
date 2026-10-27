import {
  Button as ExpoButton,
  type ButtonProps as ExpoButtonProps,
} from '@expo/ui';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { KitProps } from '../../kit-props';
import { ButtonLabel } from './button-label';
import { sizes, variantOf, widthOf } from './button-layout';
import { WebButton } from './button-web';

// The schema's Button (variant defaults to primary, size to md), plus what only the kit draws.
export type ButtonProps = KitProps<'Button'> & {
  // Kit-only, web only: a segment of a split button, its corners facing the other segment drawn small.
  joined?: 'start' | 'end';
  testID?: string;
};

export type ButtonSize = NonNullable<ButtonProps['size']>;

type Variant = NonNullable<ButtonProps['variant']>;

// Expo UI's universal Button. Each platform reads its own modifiers and ignores the other's.
export function Button(props: ButtonProps): ReactElement {
  const wide = useWide();

  return (
    <DrawnButton
      {...props}
      fullWidth={fullWidthOf(props, wide)}
      disabled={props.disabled === true || props.loading === true}
    />
  );
}

const fullWidthOf = (props: ButtonProps, wide: boolean): boolean =>
  props.fullWidth === 'narrow' ? !wide : props.fullWidth === true;

function DrawnButton(props: ButtonProps): ReactElement {
  return (
    <Host seed="primary" {...widthOf(props).host}>
      {Platform.OS === 'web' ? (
        <WebButton {...props} />
      ) : (
        <ExpoButton {...expoProps(props)}>
          <ButtonLabel {...props} />
        </ExpoButton>
      )}
    </Host>
  );
}

function expoProps(props: ButtonProps): ExpoButtonProps {
  const size = sizes[props.size ?? buttonDefaults.size];

  return {
    variant: variants[variantOf(props)],
    label: props.label,
    onPress: props.onPress,
    disabled: props.disabled,
    testID: props.testID,
    style: size.style,
    modifiers: [...size.modifiers, ...widthOf(props).modifiers],
  };
}

const variants = {
  primary: 'filled',
  secondary: 'outlined',
  text: 'text',
  danger: 'text',
} as const satisfies Record<Variant, ExpoButtonProps['variant']>;
