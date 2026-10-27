import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';
import { cn } from '#kit/utils';
import { Text, type Tone } from '#primitives/content/text';
import { labelColours, type LabelColours } from './label-colour';
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

function pillClassName(
  tone: Tone | undefined,
  className: string | undefined,
): string {
  return cn(
    'shrink-0 self-start flex-row rounded-full px-2 py-0.5',
    fills[tone ?? 'muted'],
    className,
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
    tone={textTones[tone ?? 'muted']}
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

function PillView({
  className,
  tone,
  label,
  ...props
}: PillViewProps): ReactElement {
  return (
    <View
      {...props}
      className={pillClassName(tone, className)}
      style={fillStyle(label)}
    />
  );
}

// A tracker label's colour, read for the theme the Pill draws on.
function useLabel(color: string | undefined): LabelColours | undefined {
  const { theme } = useUniwind();

  return color ? labelColours(color, theme === 'dark') : undefined;
}

export function Pill({
  text,
  tone = 'muted',
  color,
  ...props
}: PillProps): ReactElement {
  const label = useLabel(color);

  return (
    <PillView {...props} tone={tone} label={label}>
      <PillText text={text} tone={tone} label={label} />
    </PillView>
  );
}
