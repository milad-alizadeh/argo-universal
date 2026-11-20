export interface FitMeasurements {
  // Each item's width, in order; undefined until it is measured.
  widths: (number | undefined)[];
  // The "+N" Pill's width for each N from 1, at index N - 1.
  counts: (number | undefined)[];
  available: number;
  gap: number;
  // Items that never reached the line, counted in "+N", which then always shows.
  hiddenElsewhere?: number;
}

// "+N"'s count when `hidden` of the line's own items fold into it.
const countOf = (hidden: number, measurements: FitMeasurements): number =>
  hidden + (measurements.hiddenElsewhere ?? 0);

function countWidth(hidden: number, measurements: FitMeasurements): number {
  const total = countOf(hidden, measurements);

  if (total === 0) return 0;

  return (measurements.counts[total - 1] ?? Infinity) + measurements.gap;
}

function cumulativeWidths(widths: number[], gap: number): number[] {
  let used = -gap;

  return widths.map((width) => {
    used += width + gap;

    return used;
  });
}

const measuredAll = (widths: (number | undefined)[]): widths is number[] =>
  widths.every((width) => width !== undefined);

/*
 * How many items fit, whole, before the rest fold into a "+N" Pill; all of them until every width is measured. An item
 * is never cut: when not even the first fits beside the count, the count stands alone.
 */
export function fitCount(measurements: FitMeasurements): number {
  const { widths, counts } = measurements;

  return measuredAll(widths) && measuredAll(counts)
    ? fitMeasured(widths, measurements)
    : widths.length;
}

// Every item fits, beside "+N" when items were held back before the line.
const fitsWhole = (
  cumulative: number[],
  measurements: FitMeasurements,
): boolean =>
  (cumulative.at(-1) ?? 0) + countWidth(0, measurements) <=
  measurements.available;

function fitMeasured(widths: number[], measurements: FitMeasurements): number {
  const cumulative = cumulativeWidths(widths, measurements.gap);

  if (fitsWhole(cumulative, measurements)) return widths.length;

  // The first item that does not fit beside the count of those after it; none when the line has no items.
  const firstOverflow = cumulative.findIndex(
    (used, index) =>
      used + countWidth(cumulative.length - index - 1, measurements) >
      measurements.available,
  );

  return Math.max(0, firstOverflow);
}

// The row's own width with every item shown, so what it shows never decides the room it has.
export function naturalWidth(
  widths: (number | undefined)[],
  gap: number,
): number | undefined {
  if (!measuredAll(widths) || widths.length === 0) return undefined;

  return cumulativeWidths(widths, gap).at(-1);
}
