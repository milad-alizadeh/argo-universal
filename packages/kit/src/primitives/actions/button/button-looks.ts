import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import type { ButtonProps } from './button';

type Variant = NonNullable<ButtonProps['variant']>;

type ExpoStyle = ExpoButtonProps['style'];

/*
 * The web's lit primary: a gradient from a lighter top to the primary, with a top highlight, a bottom edge and a glow.
 * Colours are theme variables, which the web passes to CSS as written. Expo's native transformStyle reads only the
 * keys it knows and drops these, so iOS and Android are unchanged. WebStyle adds the two web-only keys.
 */
type WebStyle = ExpoStyle & {
  backgroundImage?: string;
  boxShadow?: string;
  filter?: string;
};

const tint = (color: string, percent: string): string =>
  `color-mix(in srgb, var(--color-${color}) ${percent}, transparent)`;

/*
 * A background-image swap cannot transition, but a box-shadow can, so hovered and pressed lift the primary's near-black
 * fill with a white wash: an inset shadow spread past the button. It sits last, under the other shadows.
 */
// The foreground at a low strength over the card: a quiet fill that keeps the label's contrast in both appearances.
const quietFill = (percent: string): string =>
  `color-mix(in srgb, var(--color-foreground) ${percent}, var(--color-card))`;

const wash = (percent: string): string =>
  `inset 0 0 0 100px ${tint('white', percent)}`;

const litShadows = [
  `inset 0 1px 0 ${tint('white', '35%')}`,
  `inset 0 -2px 0 ${tint('black', '20%')}`,
  `0 1px 2px ${tint('black', '40%')}`,
  `0 8px 24px -6px ${tint('primary', '60%')}`,
];

const lit: WebStyle = {
  backgroundImage:
    'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 80%, var(--color-white)), var(--color-primary))',
  boxShadow: [...litShadows, wash('0%')].join(', '),
};

/*
 * The web's lit secondary: a quiet fill. The same gradient and shadow family, with the fill the foreground at a low
 * strength over the card, so the label keeps its contrast in light and dark, and no border ring.
 */
const litSecondary: WebStyle = {
  backgroundImage: `linear-gradient(to bottom, ${quietFill('6%')}, ${quietFill('12%')})`,
  boxShadow: [
    `inset 0 1px 0 ${tint('white', '60%')}`,
    `inset 0 -2px 0 ${tint('black', '6%')}`,
    `0 1px 2px ${tint('black', '12%')}`,
    `0 8px 24px -6px ${tint('black', '14%')}`,
  ].join(', '),
};

export const looks: Record<Variant, WebStyle> = {
  primary: lit,
  secondary: litSecondary,
  text: {},
  danger: {},
};

// Hovered: the primary lifts toward white and the secondary dims a touch. Text looks have their own tints.
export const hoveredLooks: Record<Variant, WebStyle> = {
  primary: { boxShadow: [...litShadows, wash('12%')].join(', ') },
  secondary: { filter: 'brightness(0.97)' },
  text: {},
  danger: {},
};

/*
 * Pressed: the button sinks. The highlight, edge and drop shadows give way to an inset shadow from the top, so it
 * reads as pushed in; the primary's wash keeps that shadow visible on a near-black fill. Spread after the variant's look.
 */
export const pressedLooks: Record<Variant, WebStyle> = {
  primary: {
    boxShadow: [
      `inset 0 3px 6px ${tint('black', '80%')}`,
      `inset 0 0 0 1px ${tint('black', '50%')}`,
      `0 0 0 0 transparent`,
      `0 0 0 0 transparent`,
      wash('15%'),
    ].join(', '),
  },
  secondary: {
    boxShadow: [
      `inset 0 2px 5px ${tint('black', '20%')}`,
      `inset 0 0 0 100px ${tint('black', '3%')}`,
    ].join(', '),
  },
  text: {},
  danger: {},
};

/*
 * A disabled Button on the web: the lit look in muted neutrals. The same gradient, top highlight and bottom edge, with
 * no border, drop shadow or glow, so it keeps a little depth but does not look raised. The label is dimmed by the button.
 * Disabled is a state, not a variant: its own lookup, spread after the variant's look. Text looks stay bare.
 */
const disabledLook: WebStyle = {
  backgroundColor: 'var(--color-muted)',
  backgroundImage:
    'linear-gradient(to bottom, color-mix(in srgb, var(--color-muted) 85%, var(--color-white)), color-mix(in srgb, var(--color-muted) 90%, var(--color-black)))',
  boxShadow: [
    `inset 0 1px 0 ${tint('white', '20%')}`,
    `inset 0 -2px 0 ${tint('black', '6%')}`,
  ].join(', '),
};

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
