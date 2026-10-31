import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import type { ButtonProps } from './button';

type Variant = NonNullable<ButtonProps['variant']>;

type ExpoStyle = ExpoButtonProps['style'];

/*
 * Ink: the fill alone carries the button's weight. No gradient, no highlight, no drop shadow — the theme reserves one
 * shadow for a control and zeroes it in the dark appearance, so a button that drew its own depth contradicted it.
 * Colours are theme variables, which the web passes to CSS as written. Expo's native transformStyle reads only the keys
 * it knows and drops these, so iOS and Android are unchanged. WebStyle adds the web-only key.
 */
type WebStyle = ExpoStyle & {
  backgroundColor?: string;
};

/*
 * Hovered and pressed name their own fills, which the theme sets per appearance: a near-black primary steps lighter in
 * light, and a near-white one steps darker in the dark. They are `var()` and not a `color-mix()`, because React Native
 * Web passes a variable to CSS as written but cannot parse a mix, and drops the fill to transparent.
 */
export const looks: Record<Variant, WebStyle> = {
  primary: { backgroundColor: 'var(--color-primary)' },
  secondary: { backgroundColor: 'var(--color-muted)' },
  text: {},
  danger: {},
};

export const hoveredLooks: Record<Variant, WebStyle> = {
  primary: { backgroundColor: 'var(--color-primary-hover)' },
  secondary: { backgroundColor: 'var(--color-muted-hover)' },
  text: {},
  danger: {},
};

export const pressedLooks: Record<Variant, WebStyle> = {
  primary: { backgroundColor: 'var(--color-primary-pressed)' },
  secondary: { backgroundColor: 'var(--color-muted-pressed)' },
  text: {},
  danger: {},
};

/*
 * A disabled Button on the web: the muted fill both variants share, so neither reads as the page's verb. The label is
 * dimmed by the button. Disabled is a state, not a variant: its own lookup, spread after the variant's look. Text looks
 * stay bare.
 */
const disabledLook: WebStyle = { backgroundColor: 'var(--color-muted)' };

export const disabledLooks: Record<
  'true' | 'false',
  Record<Variant, WebStyle>
> = {
  true: {
    primary: disabledLook,
    secondary: disabledLook,
    text: {},
    danger: {},
  },
  false: { primary: {}, secondary: {}, text: {}, danger: {} },
};
