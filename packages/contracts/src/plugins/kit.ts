import { z } from 'zod';
import type { WithPropHints } from '../kit-prop-hints';
import { pluginPartSchemas } from './plugin-part-schemas';
import type { WireSchemaHints } from './plugin-prop-descriptions.gen';
import { wireParts, type WirePartDefinition } from './wire-parts';

export type { WirePartDefinition } from './wire-parts';

export { wireParts, listPartNames } from './wire-parts';

export {
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
  textProps,
  buttonProps,
  stackProps,
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
  PluginSurface,
  currentPluginSurface,
  pluginWireVersion,
  minimumPluginWireVersion,
  drawsPluginWire,
  type PluginRenderContext,
} from './surface';

export * from './settings-row-props';

export { pluginKitExports, type PluginKitExport } from './plugin-part-names';
