import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#lib/generic/use-spacing';
import { Pill } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { fitPills, pillIdentity } from './metadata-pill-fit';
import {
  PillMeasurements,
  usePillMeasurements,
} from './metadata-pill-measurements';
import type { PillValuesProps } from './metadata-props';

type VisibleProps = PillValuesProps & { count: number };

function visiblePills({ pills, count }: VisibleProps): ReactElement[] {
  return withOccurrenceKeys(pills.slice(0, count), pillIdentity).map(
    ({ item, key }) => <Pill key={key} {...item} />,
  );
}

function VisiblePills(props: VisibleProps): ReactElement {
  const hidden = props.pills.length - props.count;

  return (
    <View
      testID="metadata-visible-pills"
      className="flex-row items-center justify-end gap-1 overflow-hidden"
    >
      {visiblePills(props)}
      {hidden > 0 ? <Pill text={`+${hidden}`} /> : null}
    </View>
  );
}

// Actual Pill measurements keep overflow correct through font scaling and live prop updates.
export function MetadataPillLine({ pills }: PillValuesProps): ReactElement {
  const [available, setAvailable] = useState(0);
  const measurements = usePillMeasurements();
  const gap = useSpacing('--spacing-1');
  const count = fitPills(pills, { ...measurements, available, gap });

  return (
    <View
      className="min-w-0 flex-1"
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      <VisiblePills pills={pills} count={count} />
      <PillMeasurements pills={pills} measure={measurements.measure} />
    </View>
  );
}
