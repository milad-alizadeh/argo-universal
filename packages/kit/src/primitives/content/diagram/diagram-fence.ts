// A fenced block the Feed draws as a diagram rather than as code.
export const isDiagramFence = (language: string | undefined): boolean =>
  language?.trim().toLowerCase() === 'mermaid';

const fenceMarker = /^\s{0,3}(`{3,}|~{3,})/;

const openingMarker = (lines: string[]): string | undefined =>
  fenceMarker.exec(lines[0] ?? '')?.[1];

const closingLine = (lines: string[]): string | undefined =>
  lines.length > 1 ? lines.at(-1)?.trim() : undefined;

// A fence still streaming has no closing marker yet: marked ends the block at the end of the text.
export function isOpenFence(raw: string): boolean {
  const lines = raw.trimEnd().split('\n');
  const marker = openingMarker(lines);

  return marker !== undefined && !closingLine(lines)?.startsWith(marker);
}
