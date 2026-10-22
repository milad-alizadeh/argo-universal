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
};

const tint = (color: string, percent: string): string =>
  `color-mix(in srgb, var(--color-${color}) ${percent}, transparent)`;

const lit: WebStyle = {
  backgroundImage:
    'linear-gradient(to bottom, color-mix(in srgb, var(--color-primary) 80%, var(--color-white)), var(--color-primary))',
  boxShadow: [
    `inset 0 1px 0 ${tint('white', '35%')}`,
    `inset 0 -2px 0 ${tint('black', '20%')}`,
    `0 1px 2px ${tint('black', '40%')}`,
    `0 8px 24px -6px ${tint('primary', '60%')}`,
  ].join(', '),
};

/*
 * The web's lit secondary: the same family in neutral. A card-to-slightly-darker gradient, a border-token ring (our
 * boxShadow replaces Expo's own ring), a top highlight, a soft bottom edge, a contact shadow and a soft neutral drop.
 */
const litSecondary: WebStyle = {
  backgroundImage:
    'linear-gradient(to bottom, var(--color-card), color-mix(in srgb, var(--color-card) 94%, var(--color-black)))',
  boxShadow: [
    '0 0 0 1px var(--color-border)',
    `inset 0 1px 0 ${tint('white', '30%')}`,
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

/*
 * A disabled Button on the web: the lit look in muted neutrals. The same gradient, top highlight, bottom edge and
 * hairline, but a lighter highlight and no drop shadow or glow, so it does not look raised. Expo also dims the
 * whole web Button to half opacity, so the fill is the muted token.
 * Disabled is a state, not a variant: its own lookup, spread after the variant's look. Text looks stay bare.
 */
const unlitFill = (top: string): WebStyle => ({
  backgroundColor: 'var(--color-muted)',
  backgroundImage: `linear-gradient(to bottom, ${top}, color-mix(in srgb, var(--color-muted) 90%, var(--color-black)))`,
  boxShadow: [
    '0 0 0 1px var(--color-border)',
    `inset 0 1px 0 ${tint('white', '20%')}`,
    `inset 0 -2px 0 ${tint('black', '6%')}`,
  ].join(', '),
});

const disabledLook = unlitFill(
  'color-mix(in srgb, var(--color-muted) 85%, var(--color-white))',
);

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
