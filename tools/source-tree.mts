/*
 * One component's source as a named tree, so the rest of `new:story` reads a domain type instead of a Babel AST.
 * This module is that parse boundary: it is the only place that touches the parser's own untyped shape.
 */
import { parse } from '@babel/parser';

export interface SourceField {
  readonly key: string;
  readonly nodes: readonly SourceNode[];
}

export interface SourceNode {
  readonly kind: string;
  readonly name: string | undefined;
  readonly text: string | undefined;
  readonly operator: string | undefined;
  readonly computed: boolean;
  readonly optional: boolean;
  readonly fields: readonly SourceField[];
}

// The parser's own node keys that carry no structure a branch reader needs.
const SKIPPED = new Set([
  'loc',
  'range',
  'leadingComments',
  'trailingComments',
]);

// oxlint-disable-next-line anti-slop/no-object-parameters -- the parser hands back plain objects; this line is where they stop being plain.
const entries = (value: object): [string, unknown][] =>
  Object.entries(value).filter(([key]): boolean => !SKIPPED.has(key));

// oxlint-disable-next-line anti-slop/no-object-parameters -- as above.
const stringAt = (value: object, key: string): string | undefined => {
  const found = entries(value).find(([name]): boolean => name === key)?.[1];

  return typeof found === 'string' ? found : undefined;
};

// oxlint-disable-next-line anti-slop/no-object-parameters -- as above.
const flagAt = (value: object, key: string): boolean =>
  entries(value).some(
    ([name, found]): boolean => name === key && found === true,
  );

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- as above.
const childNodes = (value: unknown): readonly SourceNode[] => {
  if (Array.isArray(value)) return value.flatMap(childNodes);
  const node = toNode(value);

  return node === undefined ? [] : [node];
};

// oxlint-disable-next-line anti-slop/no-object-parameters -- as above.
const fieldsOf = (value: object): readonly SourceField[] =>
  entries(value).map(([key, child]): SourceField => ({
    key,
    nodes: childNodes(child),
  }));

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- as above.
const asObject = (value: unknown): object | undefined =>
  typeof value === 'object' && value !== null ? value : undefined;

// oxlint-disable-next-line anti-slop/no-object-parameters -- as above.
const namedNode = (raw: object): SourceNode | undefined => {
  const kind = stringAt(raw, 'type');

  if (kind === undefined) return undefined;

  return {
    kind,
    name: stringAt(raw, 'name'),
    text: stringAt(raw, 'value'),
    operator: stringAt(raw, 'operator'),
    computed: flagAt(raw, 'computed'),
    optional: flagAt(raw, 'optional'),
    fields: fieldsOf(raw),
  };
};

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- as above.
function toNode(value: unknown): SourceNode | undefined {
  const raw = asObject(value);

  return raw === undefined ? undefined : namedNode(raw);
}

export function sourceTree(source: string): SourceNode {
  const file = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const program = toNode(file.program);

  if (program === undefined) throw new Error('The parser returned no program.');

  return program;
}

const descend = (node: SourceNode): readonly SourceNode[] =>
  node.fields.flatMap((field): readonly SourceNode[] => field.nodes);

// Every node of the tree, parents before children.
export function allNodes(node: SourceNode): SourceNode[] {
  return [node, ...descend(node).flatMap(allNodes)];
}

const nodesOfField = (node: SourceNode, key: string): readonly SourceNode[] =>
  node.fields.find((field): boolean => field.key === key)?.nodes ?? [];

export const fieldNodes = (
  node: SourceNode | undefined,
  key: string,
): readonly SourceNode[] => (node === undefined ? [] : nodesOfField(node, key));

export const fieldNode = (
  node: SourceNode | undefined,
  key: string,
): SourceNode | undefined => fieldNodes(node, key)[0];
