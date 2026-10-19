import type { PillProps as Pill } from '#primitives/status/pill';

export const pillIdentity = (pill: Pill): string => JSON.stringify(pill);

export interface PillMeasurements {
  widths: Record<string, number>;
  available: number;
  gap: number;
}

function countWidth(hidden: number, { widths, gap }: PillMeasurements): number {
  return hidden > 0 ? (widths[`+${hidden}`] ?? Infinity) + gap : 0;
}

function cumulativeWidths(widths: number[], gap: number): number[] {
  let used = -gap;

  return widths.map((width) => {
    used += width + gap;

    return used;
  });
}

// How many Pills fit before the rest collapse into a "+N" Pill; all of them until every width is measured.
export function fitPills(
  pills: Pill[],
  measurements: PillMeasurements,
): number {
  const widths = pills.map(
    (pill) => measurements.widths[pillIdentity(pill)] ?? Infinity,
  );

  if (widths.some((width) => width === Infinity)) return pills.length;

  const cumulative = cumulativeWidths(widths, measurements.gap);

  if (fitsAll(cumulative, measurements.available)) return pills.length;

  return firstOverflow(cumulative, measurements);
}

function fitsAll(cumulative: number[], available: number): boolean {
  return (cumulative.at(-1) ?? 0) <= available;
}

function firstOverflow(
  cumulative: number[],
  measurements: PillMeasurements,
): number {
  return cumulative.findIndex(
    (used, index) =>
      used + countWidth(cumulative.length - index - 1, measurements) >
      measurements.available,
  );
}
