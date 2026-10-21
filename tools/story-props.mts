/*
 * The prop domain of a component: the props it declares and, where they are a literal union, their values.
 * A kit component's props are a mapped type over its Contracts schema, so its domain comes from the schema.
 */
import { wireParts } from '@repo/contracts/plugins/kit';
import { kitPropDescriptors } from '@repo/contracts/plugins/kit-prop-descriptors';
import { identifierName, stringText } from './source-reads.mts';
import {
  allNodes,
  fieldNode,
  fieldNodes,
  type SourceNode,
} from './source-tree.mts';

export type PropKind = 'choice' | 'boolean' | 'text' | 'number' | 'other';

export interface PropDomain {
  readonly name: string;
  readonly values: readonly string[];
  // A prop whose domain includes `boolean` branches on being true, whatever else its type allows.
  readonly acceptsBoolean: boolean;
  readonly kind: PropKind;
  readonly required: boolean;
}

const literalTypes = (node: SourceNode | undefined): readonly SourceNode[] => {
  if (node === undefined) return [];

  return node.kind === 'TSUnionType' ? fieldNodes(node, 'types') : [node];
};

const literalValue = (node: SourceNode): string | undefined =>
  node.kind === 'TSLiteralType'
    ? stringText(fieldNode(node, 'literal'))
    : undefined;

const unionValues = (annotation: SourceNode | undefined): string[] =>
  literalTypes(annotation).flatMap((type): string[] => {
    const value = literalValue(type);

    return value === undefined ? [] : [value];
  });

const KEYWORD_KINDS = new Map<string, PropKind>([
  ['TSBooleanKeyword', 'boolean'],
  ['TSStringKeyword', 'text'],
  ['TSNumberKeyword', 'number'],
]);

const keywordKinds = (annotation: SourceNode | undefined): PropKind[] =>
  annotation === undefined
    ? []
    : allNodes(annotation).flatMap((node): PropKind[] => {
        const kind = KEYWORD_KINDS.get(node.kind);

        return kind === undefined ? [] : [kind];
      });

const keywordKind = (annotation: SourceNode | undefined): PropKind =>
  keywordKinds(annotation)[0] ?? 'other';

const propKind = (
  annotation: SourceNode | undefined,
  values: readonly string[],
): PropKind => (values.length > 0 ? 'choice' : keywordKind(annotation));

const memberDomain = (member: SourceNode): PropDomain | undefined => {
  const name = identifierName(fieldNode(member, 'key'));

  const annotation = fieldNode(
    fieldNode(member, 'typeAnnotation'),
    'typeAnnotation',
  );

  if (name === undefined) return undefined;

  const values = unionValues(annotation);

  return {
    name,
    values,
    acceptsBoolean: keywordKinds(annotation).includes('boolean'),
    kind: propKind(annotation, values),
    required: !member.optional,
  };
};

const declaredMembers = (
  nodes: readonly SourceNode[],
  typeName: string,
): readonly SourceNode[] =>
  nodes
    .filter(
      (node): boolean => identifierName(fieldNode(node, 'id')) === typeName,
    )
    .flatMap((node): readonly SourceNode[] =>
      allNodes(node).filter(
        (member): boolean => member.kind === 'TSPropertySignature',
      ),
    );

// A component's own props type, read from the file that declares it.
export const declaredProps = (
  trees: readonly SourceNode[],
  component: string,
): PropDomain[] =>
  declaredMembers(trees.flatMap(allNodes), `${component}Props`).flatMap(
    (member): PropDomain[] => {
      const domain = memberDomain(member);

      return domain === undefined ? [] : [domain];
    },
  );

const typeArgument = (node: SourceNode): SourceNode | undefined =>
  fieldNodes(fieldNode(node, 'typeParameters'), 'params')[0];

/*
 * `KitProps<'Pill'>` names the Contracts schema that defines the component, which is the enumerated
 * prop domain agents were missing. A component without it declares its props in its own file.
 */
export function kitPartName(trees: readonly SourceNode[]): string | undefined {
  const reference = trees
    .flatMap(allNodes)
    .find(
      (node): boolean =>
        node.kind === 'TSTypeReference' &&
        identifierName(fieldNode(node, 'typeName')) === 'KitProps',
    );

  return reference === undefined
    ? undefined
    : stringText(fieldNode(typeArgument(reference), 'literal'));
}

const DESCRIPTOR_KINDS = new Map<string, PropKind>([
  ['choice', 'choice'],
  ['boolean', 'boolean'],
  ['text', 'text'],
  ['number', 'number'],
]);

const descriptorKind = (kind: string): PropKind =>
  DESCRIPTOR_KINDS.get(kind) ?? 'other';

const isQuoted = (member: string): boolean => member.startsWith("'");

const unquote = (member: string): string => member.replaceAll("'", '');

type WirePart = keyof typeof wireParts;

/*
 * The parts a Plugin can place over the wire carry their schema here; the handful the kit keeps local
 * (Picker, Switch, Checkbox, Slider, TextInput, SplitButton) do not, and fall back to their props type.
 */
const isWirePart = (name: string): name is WirePart =>
  Object.hasOwn(wireParts, name);

const descriptorProps = (part: WirePart): PropDomain[] =>
  kitPropDescriptors(part).map((prop): PropDomain => ({
    name: prop.name,
    values: prop.members.filter(isQuoted).map(unquote),
    acceptsBoolean: prop.members.includes('boolean'),
    kind: descriptorKind(prop.kind),
    required: prop.required,
  }));

// A kit prop's own enumeration: its schema's choices, and nothing invented beside them.
export const kitProps = (part: string): PropDomain[] =>
  isWirePart(part) ? descriptorProps(part) : [];
