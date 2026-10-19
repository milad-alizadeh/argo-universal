import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';
import type { PillProps } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';

type PillValuesProps = { pills: PillProps[] };

function MetadataPill(pill: PillProps): ReactElement {
  const neutral = ['neutral', 'muted'].includes(pill.tone ?? 'neutral');

  return <Pill {...pill} className={neutral ? 'web:bg-tint' : undefined} />;
}

export function MetadataPills({ pills }: PillValuesProps): ReactElement {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      {withOccurrenceKeys(pills, JSON.stringify).map(({ item, key }) => (
        <MetadataPill key={key} {...item} />
      ))}
    </View>
  );
}
