export interface FitMeasurements {
  // Each item's width, in order; undefined until it is measured.
  widths: (number | undefined)[];
  // The "+N" Pill's width for each N from 1, at index N - 1.
  counts: (number | undefined)[];
  available: number;
  gap: number;
}

function countWidth(hidden: number, { counts, gap }: FitMeasurements): number {
  return hidden > 0 ? (counts[hidden - 1] ?? Infinity) + gap : 0;
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
  const { widths } = measurements;

  return measuredAll(widths)
    ? fitMeasured(widths, measurements)
    : widths.length;
}

function fitMeasured(widths: number[], measurements: FitMeasurements): number {
  const { available, gap } = measurements;
  const cumulative = cumulativeWidths(widths, gap);

  if ((cumulative.at(-1) ?? 0) <= available) return widths.length;

  return cumulative.findIndex(
    (used, index) =>
      used + countWidth(cumulative.length - index - 1, measurements) >
      available,
  );
}

// The row's own width with every item shown, so what it shows never decides the room it has.
export function naturalWidth(
  widths: (number | undefined)[],
  gap: number,
): number | undefined {
  if (!measuredAll(widths) || widths.length === 0) return undefined;

  return cumulativeWidths(widths, gap).at(-1);
}
