import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import type { MetadataProps } from './metadata-props';

export type MetadataPillsProps = {
  pills: Extract<
    MetadataProps['rows'][number]['value'],
    { kind: 'pills' }
  >['pills'];
};

function MetadataPill(pill: MetadataPillsProps['pills'][number]): ReactElement {
  const neutral = ['neutral', 'muted'].includes(pill.tone ?? 'neutral');

  return <Pill {...pill} className={neutral ? 'web:bg-tint' : undefined} />;
}

export function MetadataPills({ pills }: MetadataPillsProps): ReactElement {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      {withOccurrenceKeys(pills, JSON.stringify).map(({ item, key }) => (
        <MetadataPill key={key} {...item} />
      ))}
    </View>
  );
}
