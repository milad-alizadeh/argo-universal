import type { Tone } from '#primitives/content/text';

// A run of a Shell's output in one colour; untoned text takes the output's own colour.
export interface ShellSpan {
  text: string;
  tone?: Tone;
}

export type ShellLine = ShellSpan[];

// SGR colours by their 30–37 code, the bright 90–97 codes reading as the same tone.
const colourTones: readonly Tone[] = [
  'muted',
  'danger',
  'success',
  'warning',
  'info',
  'done',
  'info',
  'neutral',
];

const firstColour = 30;

const firstBrightColour = 90;

const toneByCode = new Map<number, Tone>(
  colourTones.flatMap((tone, index) => [
    [firstColour + index, tone],
    [firstBrightColour + index, tone],
  ]),
);

const escapeCode = 0x1b;

const bellCode = 0x07;

const escape = String.fromCodePoint(escapeCode);

const bell = String.fromCodePoint(bellCode);

// CSI sequences (colours, cursor moves, erases) and OSC sequences (window titles, links).
const escapeSequence = new RegExp(
  `${escape}(?:\\[([0-9;?]*)([A-Za-z])|\\][^${bell}${escape}]*(?:${bell}|${escape}\\\\))`,
  'g',
);

interface Pen {
  colour?: Tone;
  dim: boolean;
}

const plainPen: Pen = { dim: false };

const penTone = (pen: Pen): Tone | undefined =>
  pen.colour ?? (pen.dim ? 'muted' : undefined);

type Style = (pen: Pen) => Pen;

const reset = 0;

const dim = 2;

const undim = 22;

const defaultColour = 39;

const styleCodes = new Map<number, Style>([
  [reset, (): Pen => plainPen],
  [dim, (pen): Pen => ({ ...pen, dim: true })],
  [undim, (pen): Pen => ({ ...pen, dim: false })],
  [defaultColour, (pen): Pen => ({ ...pen, colour: undefined })],
]);

function applyCode(pen: Pen, code: number): Pen {
  const style = styleCodes.get(code);

  if (style) return style(pen);

  const colour = toneByCode.get(code);

  return colour ? { ...pen, colour } : pen;
}

// An empty SGR resets, as `ESC[m` does.
function applyGraphics(pen: Pen, parameters: string): Pen {
  const codes = parameters === '' ? [0] : parameters.split(';').map(Number);

  return codes.reduce(applyCode, pen);
}

type Writer = { pen: Pen; spans: ShellSpan[] };

function write(writer: Writer, text: string): void {
  if (text === '') return;

  const tone = penTone(writer.pen);

  writer.spans.push(tone ? { text, tone } : { text });
}

function readSequence(writer: Writer, match: RegExpExecArray): void {
  if (match[2] === 'm') writer.pen = applyGraphics(writer.pen, match[1] ?? '');
}

// Writes the text between escape sequences and follows the colour they set.
function drawLine(writer: Writer, line: string): void {
  let from = 0;

  for (const match of line.matchAll(escapeSequence)) {
    write(writer, line.slice(from, match.index));
    readSequence(writer, match);
    from = match.index + match[0].length;
  }

  write(writer, line.slice(from));
}

// A carriage return redraws its line, as a progress bar does: only what follows the last one shows, while the colours before it still apply.
function redrawnLine(writer: Writer, line: string): ShellLine {
  const text = line.endsWith('\r') ? line.slice(0, -1) : line;
  const shown = text.lastIndexOf('\r') + 1;
  drawLine({ ...writer, spans: [] }, text.slice(0, shown));
  writer.spans = [];
  drawLine(writer, text.slice(shown));

  return writer.spans;
}

const outputLines = (text: string): string[] =>
  (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');

// A Shell's output as lines of coloured spans, read from its ANSI colour codes; other escape sequences are dropped.
export function shellOutputLines(text: string): ShellLine[] {
  const writer: Writer = { pen: plainPen, spans: [] };

  return outputLines(text).map((line) => redrawnLine(writer, line));
}
