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
export const kitCompounds = compoundsOf(pluginPartNames);

function compoundsOf(names: string[]): Record<string, string[]> {
  const compounds: Record<string, string[]> = {};

  for (const name of names) {
    const [root, member] = name.split('.');

    if (root && member) (compounds[root] ??= []).push(member);
  }

  return compounds;
}
