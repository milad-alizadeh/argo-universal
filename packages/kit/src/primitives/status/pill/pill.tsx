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

type Label = { label: LabelColours | undefined };

const PillText = ({
  text,
  tone,
  label,
}: Pick<PillProps, 'text' | 'tone'> & Label): ReactElement => (
  <Text
    role="badge"
    tone={textTones[tone ?? pillDefaults.tone]}
    numberOfLines={1}
    style={label ? { color: label.text } : undefined}
  >
    {text}
  </Text>
);

type PillViewProps = Omit<PillProps, 'text' | 'color'> &
  Label & { children: ReactElement };

const fillStyle = (
  label: LabelColours | undefined,
): { backgroundColor: string } | undefined =>
  label?.fill ? { backgroundColor: label.fill } : undefined;

function PillView({ tone, label, ...props }: PillViewProps): ReactElement {
  return (
    <View {...props} className={pillClassName(tone)} style={fillStyle(label)} />
  );
}

// A tracker label's colour, read for the theme the Pill draws on.
function useLabel(color: string | undefined): LabelColours | undefined {
  const { theme } = useUniwind();

  return color ? labelColours(color, theme === 'dark') : undefined;
}

function LabelPill({
  text,
  tone = pillDefaults.tone,
  color,
  variant: _variant,
  appearance: _appearance,
  ...props
}: PillProps): ReactElement {
  const label = useLabel(color);

  return (
    <PillView {...props} tone={tone} label={label}>
      <PillText text={text} tone={tone} label={label} />
    </PillView>
  );
}

export function Pill(props: PillProps): ReactElement {
  const variant = props.variant ?? pillDefaults.variant;

  return variant === 'control' ? (
    <PillControl {...props} />
  ) : (
    <LabelPill {...props} />
  );
}
