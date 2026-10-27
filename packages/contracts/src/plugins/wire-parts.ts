import { pluginPartSchemas } from './plugin-part-schemas';
import type { WirePartDefinition } from './wire-part-definition';

export type { WirePartDefinition } from './wire-part-definition';

export { listPartNames } from './list-expansion';

type WireParts<Parts> = {
  [
    Name in keyof Parts as Parts[Name] extends { wire: false } ? never : Name
  ]: Parts[Name];
};

// The overload says what the filter leaves; `fromEntries` can only say a record.
function onTheWire<Parts extends Record<string, WirePartDefinition>>(
  parts: Parts,
): WireParts<Parts>;
function onTheWire(
  parts: Record<string, WirePartDefinition>,
): Record<string, WirePartDefinition> {
  return Object.fromEntries(
    Object.entries(parts).filter(([, { wire }]) => wire),
  );
}

// Each part has one props schema; a change an older App can't draw bumps the Plugin wire version (ADR-0034).
export const wireParts = onTheWire(pluginPartSchemas);
