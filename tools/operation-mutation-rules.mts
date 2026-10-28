import { parse } from '@babel/parser';
import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isOptionalMemberExpression,
  isObjectProperty,
  isStringLiteral,
  traverseFast,
  type Node,
  type CallExpression,
} from '@babel/types';
import { permittedMutation } from './operation-mutation-exceptions.mts';

interface MutationScan {
  sites: MutationSite[];
  names: Map<number, string>;
}

interface MutationSite {
  offset: number;
  line: number;
}

function propertyName(node: Node): string | undefined {
  if (isIdentifier(node)) return node.name;

  if (isStringLiteral(node)) return node.value;

  return undefined;
}

function isMutation(node: Node): boolean {
  if (!isMemberExpression(node) && !isOptionalMemberExpression(node))
    return false;

  return propertyName(node.property) === 'mutation';
}

function nodeOffset(node: Node): number {
  return node.start ?? 0;
}

function nodeLine(node: Node): number {
  return node.loc?.start.line ?? 1;
}

function procedureName(node: Node): string {
  return propertyName(node) ?? '<computed>';
}

function mutationCall(
  call: CallExpression,
  key: Node,
): readonly [number, string] | undefined {
  if (!isMutation(call.callee)) return;

  return [nodeOffset(call.callee), procedureName(key)];
}

function mutationProperty(node: Node): readonly [number, string] | undefined {
  if (!isObjectProperty(node)) return;

  if (!isCallExpression(node.value)) return;

  return mutationCall(node.value, node.key);
}

function collectMutations(source: string): MutationScan {
  const tree = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const sites: MutationSite[] = [];
  const names = new Map<number, string>();

  traverseFast(tree, (node): void => {
    const property = mutationProperty(node);

    if (property) names.set(...property);

    if (isMutation(node))
      sites.push({ offset: nodeOffset(node), line: nodeLine(node) });
  });

  return { sites, names };
}

export function operationMutationProblems(
  file: string,
  source: string,
): string[] {
  if (file === 'packages/engine/src/operations/router.gen.ts') return [];

  const { sites, names } = collectMutations(source);

  return sites.flatMap(({ offset, line }): string[] => {
    const name = names.get(offset) ?? '<unbound>';

    return permittedMutation(file, name)
      ? []
      : [
          `${file}:${line}: Add an Operation instead of the hand-written mutation ${name}.`,
        ];
  });
}
