// A Mermaid fence read for drawing: its front-matter title, its kind and the lines below the header.
export const supportedDiagramKeywords = [
  'flowchart',
  'graph',
  'stateDiagram',
  'stateDiagram-v2',
  'sequenceDiagram',
  'classDiagram',
  'erDiagram',
] as const;

export type DiagramKeyword = (typeof supportedDiagramKeywords)[number];

export const diagramKinds = {
  flowchart: 'Flowchart',
  graph: 'Flowchart',
  stateDiagram: 'State diagram',
  'stateDiagram-v2': 'State diagram',
  sequenceDiagram: 'Sequence diagram',
  classDiagram: 'Class diagram',
  erDiagram: 'Entity relationship diagram',
} as const satisfies Record<DiagramKeyword, string>;

export interface SourceLine {
  // 1-based, counted in the fence as the Agent wrote it.
  number: number;
  text: string;
}

export interface DiagramSource {
  title: string | undefined;
  // The header's first word, such as `flowchart`, when the fence has a header.
  keyword: string | undefined;
  header: SourceLine | undefined;
  body: SourceLine[];
}

const frontMatterFence = '---';

function numbered(source: string): SourceLine[] {
  return source
    .split(/\r?\n/)
    .map((text, index) => ({ number: index + 1, text }));
}

const isFence = (line: SourceLine | undefined): boolean =>
  line?.text.trim() === frontMatterFence;

function frontMatterEnd(lines: SourceLine[]): number {
  const close = lines.findIndex((line, index) => index > 0 && isFence(line));

  return isFence(lines[0]) && close !== -1 ? close + 1 : 0;
}

// `title: Name` in the front matter, with any quotes around the name taken off.
function titleValue(line: SourceLine): string | undefined {
  const [key = '', ...value] = line.text.split(':');

  return key.trim() === 'title' ? unquoted(value.join(':').trim()) : undefined;
}

const unquoted = (value: string): string | undefined =>
  value.replaceAll(/^["']|["']$/g, '') || undefined;

function frontMatterTitle(lines: SourceLine[]): string | undefined {
  return lines.map(titleValue).find((title) => title !== undefined);
}

// Comments and `%%{init}%%` directives draw nothing; colours set there are refused anyway.
const isQuiet = (line: SourceLine): boolean =>
  line.text.trim() === '' || line.text.trim().startsWith('%%');

export function readDiagramSource(source: string): DiagramSource {
  const lines = numbered(source);
  const end = frontMatterEnd(lines);
  const [header, ...body] = lines.slice(end).filter((line) => !isQuiet(line));

  return {
    title: frontMatterTitle(lines.slice(1, Math.max(end - 1, 0))),
    keyword: header?.text.trim().split(/\s+/)[0],
    header,
    body,
  };
}

export function isDiagramKeyword(
  keyword: string | undefined,
): keyword is DiagramKeyword {
  return keyword !== undefined && Object.hasOwn(diagramKinds, keyword);
}

// The kind a reader hears, such as "Sequence diagram"; nothing before the header arrives.
export function diagramKind(source: string): string | undefined {
  const { keyword } = readDiagramSource(source);

  return isDiagramKeyword(keyword) ? diagramKinds[keyword] : undefined;
}

// The front matter's title, else the kind, such as "Flowchart"; nothing before the header arrives.
export function diagramTitle(source: string): string | undefined {
  return readDiagramSource(source).title ?? diagramKind(source);
}

// What a screen reader says for the drawing: its kind, then its title when it has one.
export function diagramLabel(source: string): string {
  const kind = diagramKind(source) ?? 'Diagram';
  const { title } = readDiagramSource(source);

  return title ? `${kind}: ${title}` : kind;
}
