// Reads the indented text that Paper's get_tree_summary tool returns.
export interface SummaryLayer {
  kind: 'layer';
  depth: number;
  id: string;
  type: string;
  name: string;
  hidden: boolean;
  text?: string;
}

// "... N children": the subtree goes deeper than the requested depth.
interface SummaryCut {
  kind: 'cut';
  depth: number;
}

export type SummaryRow = SummaryLayer | SummaryCut;

export interface ParsedSummary {
  rows: SummaryRow[];
  unrecognised: string[];
}

// Names and texts may span lines, so a row starts only where a layer type or a cut starts.
const ROW_START = /\n(?= *(?:[A-Z][A-Za-z]* "|\.\.\. \d+ children$))/m;
const LAYER_ROW =
  /^( *)([A-Za-z]+) "([\s\S]*?)" \(([A-Za-z0-9]+-\d+)\) \S+( \[hidden\])?(?: "([\s\S]*)")?$/;
const CUT_ROW = /^( *)\.\.\. \d+ children$/;
const INDENT = 2;

function group(match: RegExpExecArray, index: number): string {
  return match[index] ?? '';
}

function layerRow(match: RegExpExecArray): SummaryLayer {
  const text = match[6];
  return {
    kind: 'layer',
    depth: group(match, 1).length / INDENT,
    type: group(match, 2),
    name: group(match, 3),
    id: group(match, 4),
    hidden: match[5] !== undefined,
    ...(text === undefined ? {} : { text }),
  };
}

function cutRow(match: RegExpExecArray): SummaryCut {
  return { kind: 'cut', depth: group(match, 1).length / INDENT };
}

function parseRow(chunk: string): SummaryRow | undefined {
  const layer = LAYER_ROW.exec(chunk);
  if (layer) return layerRow(layer);
  const cut = CUT_ROW.exec(chunk);
  return cut ? cutRow(cut) : undefined;
}

export function parseTreeSummary(summary: string): ParsedSummary {
  const parsed: ParsedSummary = { rows: [], unrecognised: [] };
  for (const chunk of summary.split(ROW_START)) {
    const row = parseRow(chunk);
    if (row) parsed.rows.push(row);
    else parsed.unrecognised.push(chunk);
  }
  return parsed;
}

export function layerCount(rows: SummaryRow[]): number {
  return rows.filter((row): boolean => row.kind === 'layer').length;
}
