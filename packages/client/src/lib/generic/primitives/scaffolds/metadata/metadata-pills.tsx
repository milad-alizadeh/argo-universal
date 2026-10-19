import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { pillIdentity } from './metadata-pill-fit';
import type { PillValuesProps } from './metadata-props';

function MetadataPill(pill: PillValuesProps['pills'][number]): ReactElement {
  const neutral = ['neutral', 'muted'].includes(pill.tone ?? 'neutral');

  return <Pill {...pill} className={neutral ? 'web:bg-tint' : undefined} />;
}

export function MetadataPills({ pills }: PillValuesProps): ReactElement {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      {withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
        <MetadataPill key={key} {...item} />
      ))}
    </View>
  );
}
