import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { pillIdentity } from './metadata-pill-fit';
import type { PillValuesProps } from './metadata-props';

interface Measurements {
  widths: Record<string, number>;
  measure: (key: string, width: number) => void;
}

export function usePillMeasurements(): Measurements {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const measure = (key: string, width: number): void => {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  };

  return { widths, measure };
}

type MeasurementsProps = PillValuesProps & {
  measure: (key: string, width: number) => void;
};

type MeasuredPillProps = {
  id: string;
  pill: PillValuesProps['pills'][number];
  measure: MeasurementsProps['measure'];
};

function MeasuredPill({ id, pill, measure }: MeasuredPillProps): ReactElement {
  return (
    <View onLayout={(event) => measure(id, event.nativeEvent.layout.width)}>
      <Pill {...pill} />
    </View>
  );
}

function MeasuredValues({ pills, measure }: MeasurementsProps): ReactElement {
  return (
    <>
      {withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
        <MeasuredPill
          key={key}
          id={pillIdentity(item)}
          pill={item}
          measure={measure}
        />
      ))}
    </>
  );
}

function MeasuredCounts({ pills, measure }: MeasurementsProps): ReactElement {
  const counted = pills.map((_, index) => ({ text: `+${index + 1}` }));

  return (
    <>
      {counted.map((pill) => (
        <MeasuredPill
          key={pill.text}
          id={pill.text}
          pill={pill}
          measure={measure}
        />
      ))}
    </>
  );
}

const hiddenProps = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;

export function PillMeasurements(props: MeasurementsProps): ReactElement {
  return (
    <View {...hiddenProps} className="absolute left-0 top-0 flex-row opacity-0">
      <MeasuredValues {...props} />
      <MeasuredCounts {...props} />
    </View>
  );
}
