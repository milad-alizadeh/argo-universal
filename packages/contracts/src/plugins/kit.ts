import type { z } from 'zod';
import { wireParts, type WirePartDefinition } from './wire-parts';

export type { WirePartDefinition } from './wire-parts';

export { wireParts, listPartNames } from './wire-parts';

export type WirePart = keyof typeof wireParts;

// Hover hints come from the generated `@argo/plugin-kit` declarations, not from here.
export type WireProps = {
  [Name in WirePart]: z.output<(typeof wireParts)[Name]['props']>;
};

// Only wire parts resolve, so the Server refuses an App-only kit component such as Menu.
const partsByType = new Map<string, WirePartDefinition>(
  Object.entries(wireParts),
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

export { pluginKitExports, type PluginKitExport } from './plugin-part-names';
