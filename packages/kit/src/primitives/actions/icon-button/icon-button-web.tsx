import type { ComponentProps, ReactElement } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import { cn } from '#kit/utils';
import {
  buttonDisabledLooks,
  buttonHoveredLooks,
  buttonLooks,
  buttonPressedLooks,
} from '#primitives/actions/button';
import { Icon } from '#primitives/content/icon';
import type { IconButtonProps } from './icon-button';
import { sizeOf, variantOf } from './icon-button-layout';

type Variant = NonNullable<IconButtonProps['variant']>;

type WebProps = IconButtonProps &
  Omit<ComponentProps<typeof Pressable>, keyof IconButtonProps>;

const owned = new Set([
  'icon',
  'size',
  'variant',
  'selected',
  'muted',
  'accessibilityLabel',
  'disabled',
  'onPress',
  'testID',
  'children',
]);

// A Radix trigger clones its child with handlers, aria state and a ref; whatever the control does not own passes on.
function triggerProps(
  props: WebProps,
): Partial<Omit<WebProps, keyof IconButtonProps>> {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !owned.has(key)),
  );
}

export function WebIconButton(props: WebProps): ReactElement {
  return (
    <Pressable
      {...triggerProps(props)}
      {...pressableProps(props)}
      aria-pressed={props.selected}
    >
      <WebGlyph {...props} />
    </Pressable>
  );
}

function pressableProps(
  props: IconButtonProps,
): ComponentProps<typeof Pressable> {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: props.accessibilityLabel,
    disabled: props.disabled ?? false,
    onPress: props.onPress,
    testID: props.testID,
    className: cn(webClass, sizeOf(props).webClass, ghostClass(props)),
    style: (state) => webLook(props, state),
  };
}

function WebGlyph(props: IconButtonProps): ReactElement {
  const glyph = props.disabled ? 'text-foreground/38' : webGlyph(props);

  return (
    <Icon
      name={props.icon}
      size={sizeOf(props).iconSize}
      filled={props.selected ?? false}
      className={glyph}
    />
  );
}

const webClass =
  'shrink-0 items-center justify-center rounded-full web:transition-all web:duration-150 web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2';

// Ghost has no fill, so it takes the hover and pressed tints, and the theme's selected tint when selected; the lit looks carry their own.
const ghostClass = (props: IconButtonProps): string =>
  variantOf(props) === 'ghost'
    ? cn(
        'web:hover:bg-hover web:active:bg-pressed',
        props.selected && 'bg-selected',
      )
    : '';

const webGlyph = (props: IconButtonProps): string =>
  props.muted ? 'text-muted-foreground' : webGlyphs[variantOf(props)];

const webGlyphs = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-primary',
} as const satisfies Record<Variant, string>;

// The Button's lit looks for the same three, which it names primary, secondary and text.
const buttonVariants = {
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'text',
} as const satisfies Record<Variant, keyof typeof buttonLooks>;

interface WebState {
  pressed: boolean;
  hovered?: boolean;
}

// Hovered and pressed spread after the lit look; a disabled button takes neither.
function webLook(props: IconButtonProps, state: WebState): ViewStyle {
  const name = buttonVariants[variantOf(props)];
  const disabled = props.disabled ?? false;

  return {
    ...buttonLooks[name],
    ...stateLook(name, disabled, state),
    ...buttonDisabledLooks[`${disabled}`][name],
  };
}

function stateLook(
  name: keyof typeof buttonLooks,
  disabled: boolean,
  state: WebState,
): ViewStyle {
  return disabled ? {} : enabledLook(name, state);
}

function enabledLook(
  name: keyof typeof buttonLooks,
  state: WebState,
): ViewStyle {
  return { ...hoveredLook(name, state), ...pressedLook(name, state) };
}

function hoveredLook(
  name: keyof typeof buttonLooks,
  state: WebState,
): ViewStyle {
  return state.hovered || state.pressed ? buttonHoveredLooks[name] : {};
}

function pressedLook(
  name: keyof typeof buttonLooks,
  state: WebState,
): ViewStyle {
  return state.pressed ? buttonPressedLooks[name] : {};
}
