import { renderMermaidSVG } from 'beautiful-mermaid';
import { type MarkupInput, diagramMarkup, lineMarkup } from './diagram-markup';
import {
  type DiagramPalette,
  resolveTones,
  resolveVariables,
} from './diagram-palette';
import { isDiagramKeyword, readDiagramSource } from './diagram-source';

export interface DiagramDrawing {
  svg: string;
  width: number;
  height: number;
}

// Nothing reaches the drawing that fetches a font or a URL, or needs CSS a native SVG cannot read.
function plainSvg(svg: string): string {
  return svg
    .replaceAll(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/(<svg\b[^>]*?)\sstyle="[^"]*"/, '$1');
}

// Every diagram in a Feed shares one page on the web, so each keeps its own marker ids.
function scopedIds(svg: string, scope: string): string {
  return svg
    .replaceAll(/\bid="([^"]+)"/g, `id="${scope}-$1"`)
    .replaceAll(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`);
}

const hashMultiplier = 31;

const idRadix = 36;

function hashed(text: string): string {
  let hash = 0;

  for (const char of text)
    hash = (Math.imul(hash, hashMultiplier) + char.charCodeAt(0)) | 0;

  return `d${(hash >>> 0).toString(idRadix)}`;
}

const viewBox = (svg: string): string =>
  /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '';

function size(svg: string): Pick<DiagramDrawing, 'width' | 'height'> {
  const [, , width = 0, height = 0] = viewBox(svg).split(/\s+/).map(Number);

  return { width, height };
}

export function markupInput(source: string): MarkupInput | undefined {
  const read = readDiagramSource(source);

  if (!read.header || !isDiagramKeyword(read.keyword)) return undefined;

  return { keyword: read.keyword, header: read.header, body: read.body };
}

export function renderMarkup(markup: string): string {
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
export function drawsNothing(input: MarkupInput, svg: string): boolean {
  return svg === bareDrawing(input);
}

function renderedSvg(input: MarkupInput): string | undefined {
  try {
    const svg = renderMarkup(diagramMarkup(input));

    return drawsNothing(input, svg) ? undefined : svg;
  } catch {
    return undefined;
  }
}

export function drawDiagram(
  source: string,
  palette: DiagramPalette,
): DiagramDrawing | undefined {
  const input = markupInput(source);
  const rendered = input && renderedSvg(input);

  if (!rendered) return undefined;
  const svg = plainSvg(rendered);
  const coloured = resolveTones(resolveVariables(svg, palette), palette);

  return { svg: scopedIds(coloured, hashed(source)), ...size(svg) };
}
