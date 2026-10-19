import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Pill, type PillProps } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { pillIdentity } from './metadata-pill-fit';

type PillValuesProps = { pills: PillProps[] };

export function MetadataPills({ pills }: PillValuesProps): ReactElement {
  return (
    <View className="min-w-0 flex-row flex-wrap items-center gap-1">
      {withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
        <Pill key={key} {...item} />
      ))}
    </View>
  );
}
