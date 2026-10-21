// Readers over a `SourceNode` tree: the few shapes a component uses to write its branch set down.
import { fieldNode, fieldNodes, type SourceNode } from './source-tree.mts';

const KIND_IDENTIFIER = 'Identifier';

const KIND_OBJECT = 'ObjectExpression';

export const identifierName = (
  node: SourceNode | undefined,
): string | undefined =>
  node?.kind === KIND_IDENTIFIER ? node.name : undefined;

export const stringText = (node: SourceNode | undefined): string | undefined =>
  node?.kind === 'StringLiteral' ? node.text : undefined;

// `as const`, `satisfies Record<…>` and parentheses all wrap the literal a reader is after.
const WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'ParenthesizedExpression',
]);

export function unwrap(node: SourceNode | undefined): SourceNode | undefined {
  if (node === undefined) return undefined;

  return WRAPPERS.has(node.kind) ? unwrap(fieldNode(node, 'expression')) : node;
}

const keyName = (property: SourceNode): string | undefined =>
  identifierName(fieldNode(property, 'key')) ??
  stringText(fieldNode(property, 'key'));

const propertiesOf = (node: SourceNode | undefined): readonly SourceNode[] =>
  node?.kind === KIND_OBJECT ? fieldNodes(node, 'properties') : [];

/*
 * The keys of an object literal. A variants map and a keyed lookup table both enumerate a prop's
 * values this way, which is why one reader serves `cva({ variants: … })` and Pill's `fills`.
 */
export const objectKeys = (node: SourceNode | undefined): string[] =>
  propertiesOf(node).flatMap((property): string[] => {
    const key = keyName(property);

    return key === undefined ? [] : [key];
  });

export const propertyValue = (
  node: SourceNode | undefined,
  name: string,
): SourceNode | undefined => {
  const property = propertiesOf(node).find(
    (candidate): boolean => keyName(candidate) === name,
  );

  return unwrap(fieldNode(property, 'value'));
};

const memberProp = (node: SourceNode): string | undefined =>
  node.computed ? undefined : identifierName(fieldNode(node, 'property'));

/*
 * The prop a value reads: `tone`, `props.tone` and `tone ?? 'muted'` all name `tone`.
 * A member read names its property, so a destructured `props.tone` and a `rest.tone` resolve alike.
 */
const namedRead = (inner: SourceNode): string | undefined => {
  if (inner.kind === 'MemberExpression') return memberProp(inner);

  return inner.kind === 'LogicalExpression'
    ? propRead(fieldNode(inner, 'left'))
    : identifierName(inner);
};

export function propRead(node: SourceNode | undefined): string | undefined {
  const inner = unwrap(node);

  return inner === undefined ? undefined : namedRead(inner);
}
