import {
  wireParts,
  versionsOf,
  type WirePart,
} from '@repo/contracts/plugins/kit';

// Table's legacy wire alias has no App drawing; every other wire part is in the renderer map.
export type PluginPart = Exclude<WirePart, 'Table'>;

export const pluginPartVersions = versionsOf(
  Object.keys(wireParts).filter((type) => type !== 'Table'),
);
