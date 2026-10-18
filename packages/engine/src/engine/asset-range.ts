export type AssetRange = { start: number; end: number };

type RangeResult = AssetRange | 'unsatisfiable' | null;

export function assetRange(
  header: string | undefined,
  bytes: number,
): RangeResult {
  const match = matchRange(header);

  if (!match) return null;

  if (emptyRange(match[1], match[2])) return null;

  return bounds(match[1], match[2], bytes);
}

const matchRange = (header = ''): RegExpExecArray | null =>
  /^bytes=(\d*)-(\d*)$/.exec(header);

const emptyRange = (
  first: string | undefined,
  last: string | undefined,
): boolean => !first && !last;

function bounds(
  first: string | undefined,
  last: string | undefined,
  bytes: number,
): RangeResult {
  const start = first ? Number(first) : Math.max(bytes - Number(last), 0);
  const end = first ? lastByte(last, bytes) : bytes - 1;

  return checkedBounds({ start, end }, bytes);
}

const lastByte = (last: string | undefined, bytes: number): number =>
  last ? Math.min(Number(last), bytes - 1) : bytes - 1;

function checkedBounds(range: AssetRange, bytes: number): RangeResult {
  if (!safeBounds(range)) return null;

  if (!satisfiable(range, bytes)) return 'unsatisfiable';

  return range;
}

const safeBounds = (range: AssetRange): boolean =>
  Number.isSafeInteger(range.start) && Number.isSafeInteger(range.end);

const satisfiable = (range: AssetRange, bytes: number): boolean =>
  range.start < bytes && range.end >= range.start;
