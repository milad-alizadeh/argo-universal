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
