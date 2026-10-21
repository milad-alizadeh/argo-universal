import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { useSpacing } from '#kit/use-spacing';
import { Pill, type PillProps } from '#primitives/status/pill';
import { withOccurrenceKeys } from '../../../occurrence-keys';
import { fitPills, pillIdentity } from './metadata-pill-fit';

type PillValuesProps = { pills: PillProps[] };

type Measure = (key: string, width: number) => void;

/*
 * iOS keeps Pills on one line: as many as fit, then "+N" for the rest.
 * Actual Pill measurements keep overflow correct through font scaling and live prop updates.
 */
export function MetadataPills({ pills }: PillValuesProps): ReactElement {
  const [available, setAvailable] = useState(0);
  const { widths, measure } = usePillWidths();
  const gap = useSpacing('--spacing-1');
  const count = fitPills(pills, { widths, available, gap });

  return (
    <View
      className="min-w-0 flex-1"
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      <VisiblePills pills={pills} count={count} />
      <Measurements pills={pills} measure={measure} />
    </View>
  );
}

interface PillWidths {
  widths: Record<string, number>;
  measure: Measure;
}

function usePillWidths(): PillWidths {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const measure: Measure = (key, width) => {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  };

  return { widths, measure };
}

function VisiblePills(
  props: PillValuesProps & { count: number },
): ReactElement {
  const hidden = props.pills.length - props.count;

  return (
    <View
      testID="metadata-visible-pills"
      className="flex-row items-center justify-end gap-1 overflow-hidden"
    >
      {keyedPills(props.pills.slice(0, props.count))}
      {hidden > 0 ? <Pill text={`+${hidden}`} /> : null}
    </View>
  );
}

function keyedPills(pills: PillProps[]): ReactElement[] {
  return withOccurrenceKeys(pills, pillIdentity).map(({ item, key }) => (
    <Pill key={key} {...item} />
  ));
}

const hiddenProps = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;

// Every Pill and every possible "+N", drawn invisibly so the line knows their widths before it fits.
function Measurements(
  props: PillValuesProps & { measure: Measure },
): ReactElement {
  return (
    <View {...hiddenProps} className="absolute left-0 top-0 flex-row opacity-0">
      {measuredPills(props.pills, props.measure)}
    </View>
  );
}

function measuredPills(pills: PillProps[], measure: Measure): ReactElement[] {
  const counts = pills.map((_, index) => ({ text: `+${index + 1}` }));

  const values = withOccurrenceKeys(pills, pillIdentity).map(
    ({ item, key }) => ({ key, id: pillIdentity(item), pill: item }),
  );

  const all = [
    ...values,
    ...counts.map((pill) => ({ key: pill.text, id: pill.text, pill })),
  ];

  return all.map(({ key, id, pill }) => (
    <MeasuredPill key={key} id={id} pill={pill} measure={measure} />
  ));
}

function MeasuredPill(props: {
  id: string;
  pill: PillProps;
  measure: Measure;
}): ReactElement {
  return (
    <View
      onLayout={(event) =>
        props.measure(props.id, event.nativeEvent.layout.width)
      }
    >
      <Pill {...props.pill} />
    </View>
  );
}
