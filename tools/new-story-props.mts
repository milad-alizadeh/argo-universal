import { parse } from '@babel/parser';
import {
  isIdentifier,
  isStringLiteral,
  isTSInterfaceDeclaration,
  isTSLiteralType,
  isTSPropertySignature,
  isTSTypeAliasDeclaration,
  isTSTypeLiteral,
  isTSTypeReference,
  type Node,
  type TSPropertySignature,
  type TSType,
  type TSTypeElement,
  traverseFast,
} from '@babel/types';

// The props `pnpm new:story` reads from a non-kit component's own props type (ADR-0040).
export interface Prop {
  name: string;
  required: boolean;
  kind: 'text' | 'number' | 'boolean' | 'choice' | 'handler' | 'opaque';
  options: string[] | undefined;
}

export const parseSource = (source: string): Node =>
  parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
    .program;

// Every interface and type alias in the sources, by name, so a prop typed by a local alias reads through it.
function declarations(sources: string[]): Map<string, Node> {
  const found = new Map<string, Node>();

  for (const program of sources.map(parseSource))
    traverseFast(program, (node): void => {
      if (isTSInterfaceDeclaration(node) || isTSTypeAliasDeclaration(node))
        found.set(node.id.name, node);
    });

  return found;
}

const scalarKinds = new Map<string, Prop['kind']>([
  ['TSStringKeyword', 'text'],
  ['TSNumberKeyword', 'number'],
  ['TSBooleanKeyword', 'boolean'],
  ['TSFunctionType', 'handler'],
]);

const stringLiteral = (type: TSType): string | undefined =>
  isTSLiteralType(type) && isStringLiteral(type.literal)
    ? type.literal.value
    : undefined;

// A union of string literals is a choice; any other union is opaque.
function unionOptions(type: TSType): string[] | undefined {
  if (type.type !== 'TSUnionType') return undefined;

  const options = type.types.map(stringLiteral);

  return options.every((option) => option !== undefined)
    ? options.filter((option) => option !== undefined)
    : undefined;
}

interface Reading {
  kind: Prop['kind'];
  options: string[] | undefined;
}

const referenceName = (type: TSType): string | undefined =>
  isTSTypeReference(type) && isIdentifier(type.typeName)
    ? type.typeName.name
    : undefined;

const aliased = (type: TSType, types: Map<string, Node>): TSType => {
  const declared = types.get(referenceName(type) ?? '');

  return isTSTypeAliasDeclaration(declared) ? declared.typeAnnotation : type;
};

function reading(type: TSType, types: Map<string, Node>): Reading {
  const resolved = aliased(type, types);

  const options = unionOptions(resolved);

  if (options !== undefined) return { kind: 'choice', options };

  return { kind: scalarKinds.get(resolved.type) ?? 'opaque', options };
}

interface Member {
  name: string;
  optional: boolean;
  type: TSType;
}

const keyName = (signature: TSPropertySignature): string | undefined =>
  isIdentifier(signature.key) ? signature.key.name : undefined;

const annotation = (signature: TSPropertySignature): TSType | undefined =>
  signature.typeAnnotation?.typeAnnotation;

function member(signature: TSPropertySignature): Member | undefined {
  const name = keyName(signature);

  const type = annotation(signature);

  return name === undefined || type === undefined
    ? undefined
    : { name, optional: Boolean(signature.optional), type };
}

const signature = (element: TSTypeElement): Member | undefined =>
  isTSPropertySignature(element) ? member(element) : undefined;

const propOf =
  (types: Map<string, Node>) =>
  (element: TSTypeElement): Prop[] => {
    const read = signature(element);

    return read === undefined
      ? []
      : [
          {
            name: read.name,
            required: !read.optional,
            ...reading(read.type, types),
          },
        ];
  };

// The members an interface or an object-literal alias declares; an intersection contributes its literal parts.
const literalMembers = (type: TSType): TSTypeElement[] => {
  const parts = type.type === 'TSIntersectionType' ? type.types : [type];

  return parts.flatMap((part) => (isTSTypeLiteral(part) ? part.members : []));
};

function members(declared: Node | undefined): TSTypeElement[] {
  if (isTSInterfaceDeclaration(declared)) return declared.body.body;

  return isTSTypeAliasDeclaration(declared)
    ? literalMembers(declared.typeAnnotation)
    : [];
}

// `<Component>Props`, read from the component's folder and the files it imports.
export function declaredProps(sources: string[], component: string): Prop[] {
  const types = declarations(sources);

  return members(types.get(`${component}Props`)).flatMap(propOf(types));
}
