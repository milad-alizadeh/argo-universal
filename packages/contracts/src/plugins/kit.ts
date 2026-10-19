import { z } from 'zod';
import type { WithPropHints } from '../kit-prop-hints';
import { pluginPartSchemas } from './plugin-part-schemas';
import type { WireSchemaHints } from './plugin-prop-descriptions.gen';
import { wireParts, type WirePartDefinition } from './wire-parts';

export { textForApp } from './text-for-app';

export type { WirePartDefinition } from './wire-parts';

export { wireParts, listPartNames } from './wire-parts';

export {
  listProps,
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
  textProps,
  buttonProps,
  layoutProps,
  stackProps,
  groupedItemProps,
  svgProps,
  emptyStateProps,
} from './kit-props';

export type WirePart = keyof typeof wireParts;

export type WireProps = {
  [Name in WirePart]: WithPropHints<
    z.output<(typeof wireParts)[Name]['props']>,
    Name extends keyof WireSchemaHints
      ? WireSchemaHints[Name]
      : Record<never, never>
  >;
};

const partsByType = new Map(
  Object.entries({ ...pluginPartSchemas, ...wireParts }),
);

export function wirePart(type: string): WirePartDefinition | undefined {
  return partsByType.get(type);
}

export {
  PartVersions,
  PluginSurface,
  type PluginRenderContext,
} from './surface';

import type { PartVersions } from './surface';

// Apps predating part reports draw the original four parts.
export const legacyPartVersions: PartVersions = {
  Text: 1,
  Button: 1,
  Row: 1,
  Column: 1,
};

export function versionsOf(types: readonly string[]): PartVersions {
  return Object.fromEntries(
    types.flatMap((type) => {
      const part = wirePart(type);

      return part ? [[type, part.versions.length]] : [];
    }),
  );
}

// Internal Server callers use the current wire; Apps negotiate their own part versions.
export const currentPartVersions = versionsOf(Object.keys(wireParts));

export * from './settings-row-props';

export {
  pluginPartNames,
  kitCompounds,
  isLegacyWirePart,
  type KitCompoundMember,
  type PluginPart,
} from './plugin-part-names';
