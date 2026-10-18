import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { StatusDot } from '#primitives/status/status-dot';
import { MetadataPills } from './metadata-pills';
import type { MetadataProps } from './metadata-props';

type Value = MetadataProps['rows'][number]['value'];

type TextValue = Exclude<Value, { kind: 'pills' }>;

export function valueLabel(value: Value): string {
  return value.kind === 'pills'
    ? value.pills.map((pill) => pill.text).join(', ')
    : value.text;
}

function ValueIcon({ value }: { value: TextValue }): ReactNode {
  if (value.kind === 'status')
    return (
      <StatusDot tone={value.tone} size={Platform.OS === 'ios' ? 'md' : 'sm'} />
    );

  return <TextIcon value={value} />;
}

function TextIcon({
  value,
}: {
  value: Extract<Value, { kind: 'text' }>;
}): ReactNode {
  return value.icon ? <Icon name={value.icon} role="body" /> : null;
}

export function MetadataValue({ value }: { value: Value }): ReactElement {
  if (value.kind === 'pills') return <MetadataPills pills={value.pills} />;

  return (
    <View className="min-w-0 flex-row items-center gap-1.5">
      <ValueIcon value={value} />
      <Text
        role="row"
        tone={Platform.OS === 'web' ? undefined : 'muted'}
        className="min-w-0 shrink"
      >
        {value.text}
      </Text>
    </View>
  );
}
