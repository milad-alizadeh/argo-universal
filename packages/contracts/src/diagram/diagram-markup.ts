import type {
  DiagramKeyword,
  DiagramSource,
  SourceLine,
} from './diagram-source';

// The tones an Agent may mark a node with (`class A success`); every other class draws neutral.
export const diagramTones = [
  'info',
  'success',
  'warning',
  'danger',
  'done',
  'muted',
] as const;

export type DiagramTone = (typeof diagramTones)[number];

export type ToneRole = 'fill' | 'stroke' | 'text';

// Stands in for a tone's colour in the markup until the drawing swaps in the theme's token.
export const toneSentinel = (tone: DiagramTone, role: ToneRole): string =>
  `argo-tone-${tone}-${role}`;

// Colours an Agent sets draw nothing: Argo's tokens colour every diagram (ADR-0056).
export const colourStatement = /^\s*(?:style|classDef|linkStyle)\b/;

// `A-->B` reads as one node named `A--` without the space Mermaid itself does not need.
const tightArrow =
  /(?<=[\w)\]}])(?=<?(?:-->|-\.->|==>|---|-\.-|===|--\s|-\.\s|==\s))/g;

const isFlowchart = (keyword: DiagramKeyword): boolean =>
  keyword === 'flowchart' || keyword === 'graph';

const hasNoDirection = (header: SourceLine): boolean =>
  header.text.trim().split(/\s+/).length === 1;

// Mermaid draws `flowchart` with no direction top to bottom; the renderer needs it written.
function headerText(keyword: DiagramKeyword, header: SourceLine): string {
  return isFlowchart(keyword) && hasNoDirection(header)
    ? `${keyword} TD`
    : header.text.trim();
}

function bodyText(keyword: DiagramKeyword, line: SourceLine): string {
  return isFlowchart(keyword) ? line.text.replace(tightArrow, ' ') : line.text;
}

function toneClass(tone: DiagramTone): string {
  const role = (name: ToneRole): string => toneSentinel(tone, name);

  return `classDef ${tone} fill:${role('fill')},stroke:${role('stroke')},color:${role('text')}`;
}

const toneClasses = (keyword: DiagramKeyword): string[] =>
  isFlowchart(keyword) ? diagramTones.map(toneClass) : [];

export interface MarkupInput {
  keyword: DiagramKeyword;
  header: SourceLine;
  body: DiagramSource['body'];
}

// What the renderer reads: the header, the lines with their colours taken out, and the tone classes.
export function diagramMarkup({ keyword, header, body }: MarkupInput): string {
  const lines = body
    .filter((line) => !colourStatement.test(line.text))
    .map((line) => bodyText(keyword, line));

  return [headerText(keyword, header), ...lines, ...toneClasses(keyword)].join(
    '\n',
  );
}

// One line under its header, so a check can see whether that line alone draws anything.
export function lineMarkup(input: MarkupInput, line?: SourceLine): string {
  return diagramMarkup({ ...input, body: line ? [line] : [] });
}
