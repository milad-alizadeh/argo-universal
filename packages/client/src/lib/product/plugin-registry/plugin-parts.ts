import { wireParts, versionsOf } from '@repo/contracts/plugins/kit';

export type { PluginPart } from '@repo/contracts/plugins/kit';

// Legacy wire aliases lower to kit components; Table remains unsupported.

export const pluginPartVersions = versionsOf(
  Object.keys(wireParts).filter((type) => type !== 'Table'),
);
