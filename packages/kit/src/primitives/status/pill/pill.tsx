import { pillDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';
import { cn } from '#kit/utils';
import { Text, type Tone } from '#primitives/content/text';
import { labelColours, type LabelColours } from './label-colour';
import { PillControl } from './pill-control';
import { pillGeometry } from './pill-geometry';
import type { PillProps } from './pill-props';

const fills = {
  /*
   * Muted takes the tint because a muted fill vanishes on the neutral-100 content surface, and neutral
   * stays the stronger of the two, as it is in every other tone map in the kit.
   */
  neutral: 'bg-foreground/14',
  muted: 'bg-tint',
  accent: 'bg-accent/10',
  info: 'bg-info/14',
  success: 'bg-success/14',
  warning: 'bg-warning/18',
  danger: 'bg-danger/14',
  done: 'bg-done/14',
} satisfies Record<Tone, string>;

// Warning text stays foreground, as amber text on amber reads poorly.
const textTones = {
  neutral: 'neutral',
  muted: 'muted',
  accent: 'accent',
  info: 'info',
  success: 'success',
  warning: 'neutral',
  danger: 'danger',
  done: 'done',
} as const satisfies Record<Tone, Tone>;

function pillClassName(tone: Tone | undefined): string {
  return cn(
    pillGeometry('label'),
    'shrink-0 self-start',
    fills[tone ?? pillDefaults.tone],
  );
}

// The Pill's words, drawn by LabelPill itself so a Pill is no deeper than its View and Text.
const pillText = (
  { text, tone }: Pick<PillProps, 'text' | 'tone'>,
  label: LabelColours | undefined,
): ReactElement => (
  <Text
    role="badge"
    tone={textTones[tone ?? pillDefaults.tone]}
    numberOfLines={1}
    style={label ? { color: label.text } : undefined}
  >
    {text}
  </Text>
);

const fillStyle = (
  label: LabelColours | undefined,
): { backgroundColor: string } | undefined =>
  label?.fill ? { backgroundColor: label.fill } : undefined;

// A tracker label's colour, read for the theme the Pill draws on.
function useLabel(color: string | undefined): LabelColours | undefined {
  const { theme } = useUniwind();

  return color ? labelColours(color, theme === 'dark') : undefined;
}

// What the Pill hands its View: everything but its own words, tone, colour, variant and appearance.
const viewProps = ({
  text: _text,
  tone: _tone,
  color: _color,
  variant: _variant,
  appearance: _appearance,
  ...props
}: PillProps): Omit<PillProps, keyof PillOwnProps> => props;

type PillOwnProps = Pick<
  PillProps,
  'text' | 'tone' | 'color' | 'variant' | 'appearance'
>;

// A plain function, so a label Pill is no deeper than its View and Text.
function labelPill(
  props: PillProps,
  label: LabelColours | undefined,
): ReactElement {
  const tone = props.tone ?? pillDefaults.tone;

  return (
    <View
      {...viewProps(props)}
      className={pillClassName(tone)}
      style={fillStyle(label)}
    >
      {pillText({ text: props.text, tone }, label)}
    </View>
  );
}

export function Pill(props: PillProps): ReactElement {
  const variant = props.variant ?? pillDefaults.variant;
  const label = useLabel(props.color);

  return variant === 'control' ? (
    <PillControl {...props} />
  ) : (
    labelPill(props, label)
  );
}
