// A drawn piece of markdown, measured from the top of the message. Text has a line height and can be cut between lines; a code block or table cannot.
export interface MeasuredLeaf {
  y: number;
  height: number;
  lineHeight?: number;
}

const tolerance = 0.5;

function lineBreaks({ y, height, lineHeight }: MeasuredLeaf): number[] {
  if (lineHeight === undefined) return [];
  const lines = Math.round(height / lineHeight);

  return Array.from(
    { length: lines - 1 },
    (_, line) => y + (line + 1) * lineHeight,
  );
}

function isBetweenLines(leaf: MeasuredLeaf, cut: number): boolean {
  if (leaf.lineHeight === undefined) return false;
  const lines = (cut - leaf.y) / leaf.lineHeight;

  return Math.abs(lines - Math.round(lines)) * leaf.lineHeight < tolerance;
}

function splits(leaf: MeasuredLeaf, cut: number): boolean {
  return (
    cut > leaf.y + tolerance &&
    cut < leaf.y + leaf.height - tolerance &&
    !isBetweenLines(leaf, cut)
  );
}

// The deepest line or block end within the limit that shows no line in part, or the limit when nothing fits.
export function wholeLineCut(
  leaves: readonly MeasuredLeaf[],
  limit: number,
): number {
  const cuts = leaves
    .flatMap((leaf) => [leaf.y + leaf.height, ...lineBreaks(leaf)])
    .filter((cut) => cut > tolerance && cut <= limit + tolerance)
    .filter((cut) => leaves.every((leaf) => !splits(leaf, cut)));

  return cuts.length === 0 ? limit : Math.max(...cuts);
}
