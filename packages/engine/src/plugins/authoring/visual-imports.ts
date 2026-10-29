import {
  Visitor,
  type Program,
  type JSXOpeningElement,
  type ImportDeclaration,
} from 'oxc-parser';
import { visualComponents } from '../visual/validation';

export function visualImports(program: Program): Map<string, string> {
  const names = new Map<string, string>();
  new Visitor({ ImportDeclaration: (node): void => record(names, node) }).visit(
    program,
  );

  return names;
}

function record(names: Map<string, string>, node: ImportDeclaration): void {
  if (node.source.value !== '@argo/plugin-kit') return;

  for (const specifier of node.specifiers) addSpecifier(names, specifier);
}

function addSpecifier(
  names: Map<string, string>,
  specifier: ImportDeclaration['specifiers'][number],
): void {
  if (specifier.type === 'ImportNamespaceSpecifier')
    addNamespace(names, specifier.local.name);

  if (specifier.type === 'ImportSpecifier') addNamed(names, specifier);
}

function addNamespace(names: Map<string, string>, prefix: string): void {
  for (const name of visualComponents) names.set(`${prefix}.${name}`, name);
}

function addNamed(
  names: Map<string, string>,
  specifier: Extract<
    ImportDeclaration['specifiers'][number],
    { type: 'ImportSpecifier' }
  >,
): void {
  const name =
    specifier.imported.type === 'Identifier'
      ? specifier.imported.name
      : specifier.imported.value;

  if (visualComponents.includes(name)) names.set(specifier.local.name, name);
}

function jsxName(name: JSXOpeningElement['name']): string {
  if (name.type === 'JSXIdentifier') return name.name;

  if (name.type !== 'JSXMemberExpression') return '';

  return `${jsxName(name.object)}.${name.property.name}`;
}

export function visualName(
  node: JSXOpeningElement,
  names: Map<string, string>,
): string | undefined {
  const name = jsxName(node.name);
  const exact = names.get(name);

  if (exact) return exact;

  const prefix = [...names].find(
    ([local, type]) => type === 'Canvas' && name.startsWith(`${local}.`),
  );

  return prefix ? name.replace(prefix[0], 'Canvas') : undefined;
}
