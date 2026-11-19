import { type ReactElement, type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { Pill } from '#primitives/status/pill';

export interface Item {
  key: string;
  node: ReactNode;
}

export const countKey = (hidden: number): string => `+${hidden}`;

export type Measure = (key: string, width: number) => void;

interface Widths {
  widths: Record<string, number>;
  measure: Measure;
}

export function useWidths(): Widths {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const measure: Measure = (key, width) => {
    setWidths((current) =>
      current[key] === width ? current : { ...current, [key]: width },
    );
  };

  return { widths, measure };
}

const hiddenProps = {
  'aria-hidden': true,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;

// What "+N" stands for: how many it counts, and the first of the line's own items it holds.
export interface Overflow {
  count: number;
  firstHidden: number;
}

export type DrawMore = (overflow: Overflow) => ReactNode;

export const drawPill: DrawMore = ({ count }) => (
  <Pill text={countKey(count)} />
);

// Every count "+N" can show, with the line's items it would hold.
function countItems(props: MeasurementsProps): Item[] {
  const { items, hiddenElsewhere, more } = props;

  return Array.from({ length: items.length + hiddenElsewhere }, (_, index) => {
    const count = index + 1;
    const firstHidden = Math.max(0, items.length - count + hiddenElsewhere);

    return { key: countKey(count), node: more({ count, firstHidden }) };
  });
}

interface MeasurementsProps {
  items: Item[];
  hiddenElsewhere: number;
  more: DrawMore;
  measure: Measure;
}

// Every item and every possible "+N", drawn unseen at their own widths.
export function Measurements(props: MeasurementsProps): ReactElement {
  return (
    <View {...hiddenProps} className="absolute top-0 left-0 flex-row opacity-0">
      {[...props.items, ...countItems(props)].map((item) => (
        <Measured key={item.key} item={item} measure={props.measure} />
      ))}
    </View>
  );
}

type MeasuredProps = { item: Item; measure: Measure };

function Measured({ item, measure }: MeasuredProps): ReactElement {
  return (
    <View
      className="shrink-0"
      onLayout={(event) => measure(item.key, event.nativeEvent.layout.width)}
    >
      {item.node}
    </View>
  );
}
