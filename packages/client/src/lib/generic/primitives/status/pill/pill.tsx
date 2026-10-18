import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Text, type Tone } from '#primitives/content/text';
import type { PillProps } from './pill-props';

const fills = {
  neutral: 'bg-muted', muted: 'bg-muted', accent: 'bg-accent/10', info: 'bg-info/10',
  success: 'bg-success/10', warning: 'bg-warning/10', danger: 'bg-danger/10', done: 'bg-done/10',
} satisfies Record<Tone, string>;

export function Pill({ text, tone = 'muted', color, className, ...props }: PillProps): ReactElement {
  return <View {...props} className={cn('shrink-0 flex-row rounded-full px-2 py-0.5', fills[tone], className)}>
    <Text role="secondary" tone={tone} numberOfLines={1} style={color ? { color } : undefined}>{text}</Text>
  </View>;
}
