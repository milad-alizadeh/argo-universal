/*
 * The branch set of a component: the prop values it branches on (ADR-0040).
 * A prop value earns a story when it is a key in a variants map, a key in a table the prop indexes,
 * a literal the component compares the prop against, or a boolean the component reads for truth.
 */
import {
  identifierName,
  objectKeys,
  propertyValue,
  propRead,
  stringText,
  unwrap,
} from './source-reads.mts';
import {
  allNodes,
  fieldNode,
  fieldNodes,
  type SourceNode,
} from './source-tree.mts';

export interface Branch {
  readonly prop: string;
  readonly value: string;
}

export const TRUE = 'true';

// A component writes its variants map as the second argument of one of these calls.
const VARIANT_CALLS = new Set(['cva', 'tv']);

const callName = (node: SourceNode): string | undefined =>
  identifierName(fieldNode(node, 'callee'));

const variantsMap = (node: SourceNode): SourceNode | undefined =>
  fieldNodes(node, 'arguments')
    .map((argument): SourceNode | undefined =>
      propertyValue(unwrap(argument), 'variants'),
    )
    .find((found): boolean => found !== undefined);

const mapBranches = (map: SourceNode | undefined): Branch[] =>
  objectKeys(map).flatMap((prop): Branch[] =>
    objectKeys(propertyValue(map, prop)).map((value): Branch => ({
      prop,
      value,
    })),
  );

const variantBranches = (nodes: readonly SourceNode[]): Branch[] =>
  nodes
    .filter(
      (node): boolean =>
        node.kind === 'CallExpression' &&
        VARIANT_CALLS.has(callName(node) ?? ''),
    )
    .flatMap((node): Branch[] => mapBranches(variantsMap(node)));

const declaredTables = (nodes: readonly SourceNode[]): Map<string, string[]> =>
  new Map(
    nodes
      .filter((node): boolean => node.kind === 'VariableDeclarator')
      .flatMap((node): [string, string[]][] => {
        const name = identifierName(fieldNode(node, 'id'));
        const keys = objectKeys(unwrap(fieldNode(node, 'init')));

        return name === undefined || keys.length === 0 ? [] : [[name, keys]];
      }),
  );

const indexedTable = (node: SourceNode): string | undefined =>
  node.computed ? identifierName(fieldNode(node, 'object')) : undefined;

const tableKeys = (tables: Map<string, string[]>, node: SourceNode): string[] =>
  tables.get(indexedTable(node) ?? '') ?? [];

const readBranches = (
  tables: Map<string, string[]>,
  node: SourceNode,
): Branch[] => {
  const prop = propRead(fieldNode(node, 'property'));

  return prop === undefined
    ? []
    : tableKeys(tables, node).map((value): Branch => ({ prop, value }));
};

/*
 * `fills[tone ?? 'muted']` says Pill branches on `tone`, and the table's keys say which values it branches on.
 * A component that keys a lookup table by a prop has written the same thing a variants map writes.
 */
const tableBranches = (nodes: readonly SourceNode[]): Branch[] => {
  const tables = declaredTables(nodes);

  return nodes
    .filter((node): boolean => node.kind === 'MemberExpression')
    .flatMap((node): Branch[] => readBranches(tables, node));
};

const sides = (
  node: SourceNode,
): [string | undefined, string | undefined][] => [
  [
    propRead(fieldNode(node, 'left')),
    stringText(unwrap(fieldNode(node, 'right'))),
  ],
  [
    propRead(fieldNode(node, 'right')),
    stringText(unwrap(fieldNode(node, 'left'))),
  ],
];

const COMPARISONS = new Set(['===', '!==', '==', '!=']);

// `props.tone === 'danger'` is a branch on `tone` with the value `danger`.
const comparisonBranches = (nodes: readonly SourceNode[]): Branch[] =>
  nodes
    .filter(
      (node): boolean =>
        node.kind === 'BinaryExpression' &&
        COMPARISONS.has(node.operator ?? ''),
    )
    .flatMap((node): Branch[] =>
      sides(node).flatMap(([prop, value]): Branch[] =>
        prop === undefined || value === undefined ? [] : [{ prop, value }],
      ),
    );

// Where a component reads a prop for its truth: `props.loading ? …`, `!!props.disabled`, `props.compact && …`.
const TRUTH_READS = new Map([
  ['ConditionalExpression', 'test'],
  ['IfStatement', 'test'],
  ['UnaryExpression', 'argument'],
  ['LogicalExpression', 'left'],
]);

const truthBranches = (nodes: readonly SourceNode[]): Branch[] =>
  nodes.flatMap((node): Branch[] => {
    const prop = propRead(fieldNode(node, TRUTH_READS.get(node.kind) ?? ''));

    return prop === undefined ? [] : [{ prop, value: TRUE }];
  });

const READERS = [
  variantBranches,
  tableBranches,
  comparisonBranches,
  truthBranches,
];

const key = ({ prop, value }: Branch): string => `${prop}\u0000${value}`;

// Every branch the component's own sources write down, each once, in reader order.
export function branchesIn(trees: readonly SourceNode[]): Branch[] {
  const nodes = trees.flatMap(allNodes);
  const found = READERS.flatMap((read): Branch[] => read(nodes));

  return [
    ...new Map(
      found.map((branch): [string, Branch] => [key(branch), branch]),
    ).values(),
  ];
}
