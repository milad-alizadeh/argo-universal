import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { FittingProps } from './fitted-row';
import { type FitMeasurements, fitCount, naturalWidth } from './fitted-row-fit';
import {
  countKey,
  type Item,
  type Measure,
  useWidths,
} from './fitted-row-measurements';

export interface Fit {
  shown: Item[];
  // What "+N" counts: the line's items that did not fit, and those held back before it.
  count: number;
  width: number | undefined;
  onLayout: (event: LayoutChangeEvent) => void;
  measure: Measure;
}

// Every item, and the "+N" for what was held back before the line; unknown until all are measured.
function lineWidth(
  natural: number | undefined,
  count: number | undefined,
  gap: number,
): number | undefined {
  if (natural === undefined) return undefined;

  return count === undefined ? natural : natural + gap + count;
}

// The measured width of every count "+N" can show, at index N - 1.
const countWidths = (
  widths: Record<string, number>,
  total: number,
): (number | undefined)[] =>
  Array.from({ length: total }, (_, index) => widths[countKey(index + 1)]);

type Shown = Pick<Fit, 'shown' | 'count' | 'width'>;

// The widths the unseen copies measured, in the room the line has.
function measurementsOf(
  props: FittingProps,
  widths: Record<string, number>,
  available: number,
): FitMeasurements {
  const { gap, hiddenElsewhere, items } = props;
  const counts = countWidths(widths, items.length + hiddenElsewhere);
  const itemWidths = items.map((item) => widths[item.key]);

  return { widths: itemWidths, counts, available, gap, hiddenElsewhere };
}

// What the line shows, from what it measured.
function shownBy(props: FittingProps, measured: FitMeasurements): Shown {
  const { hiddenElsewhere, items } = props;
  const shown = fitCount(measured);
  const natural = naturalWidth(measured.widths, measured.gap);

  return {
    shown: items.slice(0, shown),
    count: items.length - shown + hiddenElsewhere,
    width: lineWidth(
      natural,
      measured.counts[hiddenElsewhere - 1],
      measured.gap,
    ),
  };
}

// What the line shows, and how it measures its room and its unseen copies.
export function useFit(props: FittingProps): Fit {
  const [available, setAvailable] = useState(0);
  const { widths, measure } = useWidths();

  return {
    ...shownBy(props, measurementsOf(props, widths, available)),
    onLayout: (event) => setAvailable(event.nativeEvent.layout.width),
    measure,
  };
}
