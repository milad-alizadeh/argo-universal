import { renderMermaidSVG } from 'beautiful-mermaid';
import { type MarkupInput, diagramMarkup, lineMarkup } from './diagram-markup';
import {
  type SourceLine,
  isDiagramKeyword,
  readDiagramSource,
} from './diagram-source';

export function markupInput(source: string): MarkupInput | undefined {
  const read = readDiagramSource(source);

  if (!read.header || !isDiagramKeyword(read.keyword)) return undefined;

  return { keyword: read.keyword, header: read.header, body: read.body };
}

function renderMarkup(markup: string): string {
  return renderMermaidSVG(markup, { transparent: true, font: 'system-ui' });
}

// The bare header's drawing, kept per header: the check compares every line against it.
const bareDrawings = new Map<string, string>();

function bareDrawing(input: MarkupInput): string {
  const markup = lineMarkup(input);
  const drawn = bareDrawings.get(markup) ?? renderMarkup(markup);
  bareDrawings.set(markup, drawn);

  return drawn;
}

// The renderer skips what it cannot read, so a fence of only such lines draws its bare header.
const drawsNothing = (input: MarkupInput, svg: string): boolean =>
  svg === bareDrawing(input);

// The SVG the Apps draw from, or undefined when the fence draws nothing. Renderer errors throw.
export function renderDiagram(input: MarkupInput): string | undefined {
  const svg = renderMarkup(diagramMarkup(input));

  return drawsNothing(input, svg) ? undefined : svg;
}

// A line the renderer skips draws the same as the bare header when rendered on its own.
export function lineDrawsNothing(
  input: MarkupInput,
  line: SourceLine,
): boolean {
  return drawsNothing(input, renderMarkup(lineMarkup(input, line)));
}
