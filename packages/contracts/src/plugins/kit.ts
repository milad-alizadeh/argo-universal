import type { z } from 'zod';
import { kitComponents, type KitComponentDefinition } from './kit-components';

export type { KitComponentDefinition } from './kit-components';

export { kitComponents, listComponentNames } from './kit-components';

export type WireComponentName = keyof typeof kitComponents;

// Hover hints come from the generated `@argo/plugin-kit` declarations, not from here.
export type WireProps = {
  [Name in WireComponentName]: z.output<(typeof kitComponents)[Name]['props']>;
};

// Only kit components resolve, so the Server refuses an App-only kit component such as Menu.
const componentsByType = new Map<string, KitComponentDefinition>(
  Object.entries(kitComponents),
);

export function kitComponent(type: string): KitComponentDefinition | undefined {
  return componentsByType.get(type);
}

// A type that is no kit component has no events.
export const kitComponentEvents = (
  type: string,
): KitComponentDefinition['events'] => kitComponent(type)?.events ?? {};

export {
  PluginSurface,
  currentPluginSurface,
  pluginWireVersion,
  minimumPluginWireVersion,
  drawsPluginWire,
  type PluginRenderContext,
} from './surface';

export { pluginKitExports, type PluginKitExport } from './plugin-kit-exports';
