import type { MarkupInput } from './diagram-markup';
import {
  type DiagramPalette,
  resolveTones,
  resolveVariables,
} from './diagram-palette';
import { markupInput, renderDiagram } from './diagram-render';

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

function renderedSvg(input: MarkupInput): string | undefined {
  try {
    return renderDiagram(input);
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
