import { parse, type DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];

type Element = DefaultTreeAdapterMap['element'];

export type OpenGraph = {
  title: string;
  description?: string;
  image?: string;
  icon?: string;
};

type Metadata = { values: Map<string, string>; icon?: string };

const titleLimit = 500;

const descriptionLimit = 2000;

// HTML parsing handles attribute order, entities and script text without interpreting markup as code.
export function openGraph(html: string, base: string): OpenGraph | null {
  const metadata: Metadata = { values: new Map() };

  for (const element of elementsOf(parse(html)))
    readElement(metadata, element, base);
  const title = graphTitle(metadata);

  return title ? graphValue(metadata, title, base) : null;
}

function graphValue(
  { values, icon }: Metadata,
  title: string,
  base: string,
): OpenGraph {
  return {
    title: title.slice(0, titleLimit),
    description: values.get('og:description')?.slice(0, descriptionLimit),
    image: resolveImage(values.get('og:image'), base),
    icon,
  };
}

function* elementsOf(root: Node): Generator<Element> {
  const pending = [root];

  while (pending.length) {
    const node = pending.pop();

    if (node) yield* visit(node, pending);
  }
}

function readElement(metadata: Metadata, element: Element, base: string): void {
  const attrs = new Map(element.attrs.map(({ name, value }) => [name, value]));

  if (element.tagName === 'meta') readMeta(metadata.values, attrs);

  if (element.tagName === 'link') readIcon(metadata, attrs, base);
}

function readMeta(
  values: Map<string, string>,
  attrs: Map<string, string>,
): void {
  const key = metaKey(attrs);
  const value = attrs.get('content');

  if (!value) return;

  if (!values.has(key)) values.set(key, value);
}

function readIcon(
  metadata: Metadata,
  attrs: Map<string, string>,
  base: string,
): void {
  if (!isIcon(attrs)) return;

  if (metadata.icon) return;
  metadata.icon = resolveImage(attrs.get('href'), base);
}

function resolveImage(
  href: string | undefined,
  base: string,
): string | undefined {
  if (!href) return undefined;

  try {
    return httpImage(new URL(href, base));
  } catch {
    return undefined;
  }
}

function httpImage(url: URL): string | undefined {
  return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
}

function graphTitle(metadata: Metadata): string {
  return metadata.values.get('og:title')?.trim() ?? '';
}

function* elementOf(node: Node): Generator<Element> {
  if ('tagName' in node) yield node;
}

function childrenOf(node: Node): Node[] {
  return 'childNodes' in node ? node.childNodes : [];
}

function metaKey(attrs: Map<string, string>): string {
  return (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase();
}

function* visit(node: Node, pending: Node[]): Generator<Element> {
  yield* elementOf(node);

  for (const child of childrenOf(node).toReversed()) pending.push(child);
}

function isIcon(attrs: Map<string, string>): boolean {
  const rel = attrs.get('rel') ?? '';

  return rel.toLowerCase().split(/\s+/).includes('icon');
}
