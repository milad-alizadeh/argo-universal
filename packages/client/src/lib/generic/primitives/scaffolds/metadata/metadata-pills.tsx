import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';
import type { MetadataProps } from './metadata-props';

export type MetadataPillsProps = {
  pills: Extract<
    MetadataProps['rows'][number]['value'],
    { kind: 'pills' }
  >['pills'];
};

export function MetadataPills({ pills }: MetadataPillsProps): ReactElement {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      {pills.map((pill, index) => (
        <Pill
          key={index}
          {...pill}
          className={
            !pill.tone || pill.tone === 'neutral' || pill.tone === 'muted'
              ? 'web:bg-tint'
              : undefined
          }
        />
      ))}
    </View>
  );
}
