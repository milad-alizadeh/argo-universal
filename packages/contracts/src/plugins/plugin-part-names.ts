import { wireParts } from './wire-parts';

// Older Servers and Apps still exchange these wire aliases; new Plugins use the kit's actual components.
export const legacyWirePartNames = [
  'Row',
  'Column',
  'VirtualList',
  'GroupedList',
  'GroupedListItem',
  'Table',
] as const;

const legacyNames = new Set<string>(legacyWirePartNames);

export function isLegacyWirePart(name: string): boolean {
  return legacyNames.has(name);
}

export type PluginPart = Exclude<
  keyof typeof wireParts,
  (typeof legacyWirePartNames)[number]
>;

export const pluginPartNames = Object.keys(wireParts).filter(
  (name) => !isLegacyWirePart(name),
);

// A compound's members, such as `Label` for `Metadata.Label`, read from the dotted part names.
export type KitCompoundMember<Root extends string> =
  PluginPart extends infer Name
    ? Name extends `${Root}.${infer Member}`
      ? Member
      : never
    : never;

// Each compound root with its members, so the kit's `Metadata.Label` exists once a `Metadata.Label` part does.
const dottedNames = pluginPartNames.filter((name) => name.includes('.'));

const rootOf = (name: string): string => name.slice(0, name.indexOf('.'));

const membersOf = (root: string): string[] =>
  dottedNames.flatMap((name) =>
    rootOf(name) === root ? [name.slice(root.length + 1)] : [],
  );

export const kitCompounds = Object.fromEntries(
  [...new Set(dottedNames.map(rootOf))].map((root) => [root, membersOf(root)]),
);
