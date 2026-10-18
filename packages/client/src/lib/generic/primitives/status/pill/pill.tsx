import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Text, type Tone } from '#primitives/content/text';
import { cn } from '../../../utils';
import type { PillProps } from './pill-props';

const fills = {
  neutral: 'bg-muted',
  muted: 'bg-muted',
  accent: 'bg-accent/10',
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
  done: 'bg-done/10',
} satisfies Record<Tone, string>;

export function Pill({ text, tone = 'muted' }: PillProps): ReactElement {
  return (
    <View className={cn('shrink-0 rounded-full px-2 py-0.5', fills[tone])}>
      <Text role="secondary" tone={tone} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
