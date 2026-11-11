import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#kit/use-spacing';
import { Pill, type PillProps } from '#primitives/status/pill';
import { FittedRow } from '../../../fitted-row/fitted-row';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { pillIdentity } from './metadata-pill-identity';

type PillValuesProps = { pills: PillProps[] };

// iOS keeps Pills on one line at the row's end: as many as fit, then "+N" for the rest.
export function MetadataPills({ pills }: PillValuesProps): ReactElement {
  const gap = useSpacing('--spacing-1');

  return (
    <View className="min-w-0 flex-1 items-end">
      <FittedRow gap={gap} testID="metadata-visible-pills">
        {withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
          <Pill key={key} {...item} />
        ))}
      </FittedRow>
    </View>
  );
}
