import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Text, type Tone } from '#primitives/content/text';
import type { PillProps } from './pill-props';

const fills = {
  // Tint, not muted: a muted fill vanishes on the neutral-100 content surface.
  neutral: 'bg-tint',
  muted: 'bg-tint',
  accent: 'bg-accent/10',
  info: 'bg-info/14',
  success: 'bg-success/14',
  warning: 'bg-warning/18',
  danger: 'bg-danger/14',
  done: 'bg-done/14',
} satisfies Record<Tone, string>;

// Neutral text is muted; warning text stays foreground, as amber text on amber reads poorly.
const textTones = {
  neutral: 'muted',
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

const PillText = ({
  text,
  tone,
  color,
}: Pick<PillProps, 'text' | 'tone' | 'color'>): ReactElement => (
  <Text
    role="badge"
    tone={textTones[tone ?? 'muted']}
    numberOfLines={1}
    style={color ? { color } : undefined}
  >
    {text}
  </Text>
);

function PillView({
  className,
  tone,
  children,
  ...props
}: Omit<PillProps, 'text' | 'color'> & {
  children: ReactElement;
}): ReactElement {
  return (
    <View {...props} className={pillClassName(tone, className)}>
      {children}
    </View>
  );
}

export function Pill({
  text,
  tone = 'muted',
  color,
  ...props
}: PillProps): ReactElement {
  return (
    <PillView {...props} tone={tone}>
      <PillText text={text} tone={tone} color={color} />
    </PillView>
  );
}
