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

// Extra names `@argo/plugin-kit` exports for a part, kept for Plugins written against them.
const pluginPartAliases = { ListSection: 'List.Section' } as const;

// One `@argo/plugin-kit` export: a part, with each dotted part such as `List.Section` as a member of its owner.
export interface PluginKitExport {
  name: string;
  part: string;
  members: Record<string, string>;
}

function membersOf(parent: string): Record<string, string> {
  return Object.fromEntries(
    pluginPartNames.flatMap((name) => {
      const [owner, member] = name.split('.');

      return owner === parent && member ? [[member, name]] : [];
    }),
  );
}

// What the Plugin kit exports, at runtime and in its declarations; both read this list.
export const pluginKitExports: PluginKitExport[] = [
  ...pluginPartNames
    .filter((name) => !name.includes('.'))
    .map((name) => ({ name, part: name, members: membersOf(name) })),
  ...Object.entries(pluginPartAliases).map(([name, part]) => ({
    name,
    part,
    members: {},
  })),
];
