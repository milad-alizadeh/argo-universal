import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text, type Tone } from '#primitives/content/text';
import type { PillProps } from './pill-props';

const fills = {
  // Tint, not muted: a muted fill vanishes on the neutral-100 content surface.
  neutral: 'bg-tint',
  muted: 'bg-tint',
  accent: 'bg-accent/10',
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
  done: 'bg-done/10',
} satisfies Record<Tone, string>;

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
    role="secondary"
    tone={tone}
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
