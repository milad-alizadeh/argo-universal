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

const countItems = (items: Item[]): Item[] =>
  items.map((_, index) => {
    const key = countKey(index + 1);

    return { key, node: <Pill text={key} /> };
  });

// Every item and every possible "+N", drawn unseen at their own widths.
export function Measurements(props: {
  items: Item[];
  measure: Measure;
}): ReactElement {
  return (
    <View {...hiddenProps} className="absolute top-0 left-0 flex-row opacity-0">
      {[...props.items, ...countItems(props.items)].map((item) => (
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
