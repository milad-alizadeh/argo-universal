import type { KitComponentDefinition } from './kit-component-definition';
import { kitComponentSchemas } from './kit-component-schemas';

export type { KitComponentDefinition } from './kit-component-definition';

export { listComponentNames } from './list-expansion';

type WireComponents<Components> = {
  [
    Name in keyof Components as Components[Name] extends { wire: false }
      ? never
      : Name
  ]: Components[Name];
};

// The overload says what the filter leaves; `fromEntries` can only say a record.
function onTheWire<Components extends Record<string, KitComponentDefinition>>(
  components: Components,
): WireComponents<Components>;
function onTheWire(
  components: Record<string, KitComponentDefinition>,
): Record<string, KitComponentDefinition> {
  return Object.fromEntries(
    Object.entries(components).filter(([, { wire }]) => wire),
  );
}

// Each kit component has one props schema; a change an older App can't draw bumps the Plugin wire version (ADR-0034).
export const kitComponents = onTheWire(kitComponentSchemas);

// The current App draws every kit component on the wire.
export const wireComponentNames = Object.keys(kitComponents);
