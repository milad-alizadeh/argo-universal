import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { cn } from '#kit/utils';
import type { ButtonProps } from './button';
import { ButtonLabel } from './button-label';
import { sizes, variantOf } from './button-layout';
import {
  disabledLooks,
  hoveredLooks,
  looks,
  pressedLooks,
} from './button-looks';

/*
 * The web draws its own Pressable, since Expo's web Button takes one static `style` and so cannot swap the resting fill
 * for a hovered or pressed one. It keeps Expo's box: 40px high (32 small), 16px padding, 8px radius.
 */
export function WebButton(props: ButtonProps): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      disabled={props.disabled ?? false}
      onPress={props.onPress}
      testID={props.testID}
      className={buttonClass(props)}
      style={(state) => webStyle(props, state)}
    >
      <WebLabel {...props} />
    </Pressable>
  );
}

const buttonClass = (props: ButtonProps): string =>
  cn(
    webClass,
    joinedClasses[props.joined ?? 'none'],
    props.fullWidth === true && 'w-full',
  );

function WebLabel(props: ButtonProps): ReactElement {
  return (
    <View className={cn(props.disabled && 'opacity-40')}>
      <ButtonLabel {...props} />
    </View>
  );
}

/*
 * A segment of a split button keeps the Button's radius on its outer corners; the corners facing the other segment
 * take a small one, as Material 3's split button draws it.
 */
export const joinedClasses = {
  none: '',
  start: 'rounded-r-sm',
  end: 'rounded-l-sm',
};

export const webClass =
  'h-10 shrink-0 items-center justify-center rounded-lg px-4 web:whitespace-nowrap web:transition-all web:duration-150 web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2';

interface WebState {
  pressed: boolean;
  hovered?: boolean;
}

export function webStyle(props: ButtonProps, state: WebState): ViewStyle {
  return {
    ...sizes[props.size ?? buttonDefaults.size].style,
    ...webLook(props, state),
  };
}

// Hovered and pressed spread after the resting look; a disabled button takes neither.
function webLook(props: ButtonProps, state: WebState): ViewStyle {
  const name = variantOf(props);
  const disabled = props.disabled ?? false;

  return {
    ...looks[name],
    ...stateLook(name, disabled, state),
    ...disabledLooks[`${disabled}`][name],
  };
}

function stateLook(
  name: keyof typeof looks,
  disabled: boolean,
  state: WebState,
): ViewStyle {
  return disabled ? {} : enabledLook(name, state);
}

function enabledLook(name: keyof typeof looks, state: WebState): ViewStyle {
  return { ...hoveredLook(name, state), ...pressedLook(name, state) };
}

function hoveredLook(name: keyof typeof looks, state: WebState): ViewStyle {
  return state.hovered ? hoveredLooks[name] : {};
}

function pressedLook(name: keyof typeof looks, state: WebState): ViewStyle {
  return state.pressed ? pressedLooks[name] : {};
}
