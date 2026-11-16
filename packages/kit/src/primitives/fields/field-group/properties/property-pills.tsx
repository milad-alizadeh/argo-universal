import type { ReactElement } from 'react';
import { View } from 'react-native';
import { withOccurrenceKeys } from '#kit/occurrence-keys';
import { Pill, type PillProps } from '#primitives/status/pill';
import { pillIdentity } from './property-pill-identity';

type PillValuesProps = { pills: PillProps[] };

export function PropertyPills({ pills }: PillValuesProps): ReactElement {
  return (
    <View className="max-w-full min-w-0 shrink flex-row flex-wrap items-center gap-1">
      {withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
        <Pill key={key} {...item} />
      ))}
    </View>
  );
}
