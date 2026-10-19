import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import type { PluginProp, PluginProps } from './plugin-rendering';

type Bind = (
  value: WireJson,
  path: string[],
) => ((value?: WireJson) => void) | undefined;

interface NestedInput {
  value: WireJson;
  path: string[];
  bind: Bind;
}

export function nestedEventProps(
  props: WireNode['props'],
  bind: Bind,
): PluginProps {
  return Object.fromEntries(
    Object.entries(props).map(([name, value]) => [
      name,
      mappedValue({ value, path: [name], bind }),
    ]),
  );
}

function mappedValue(input: NestedInput): PluginProp {
  return input.bind(input.value, input.path) ?? mappedContent(input);
}

function mappedContent(input: NestedInput): PluginProp {
  const { value } = input;

  if (Array.isArray(value)) return mappedArray(input, value);

  return mappedObject(input);
}

// Unbound content keeps its identity, so a render rebuilds only what holds a handler.
function mappedArray(input: NestedInput, value: WireJson[]): PluginProp {
  const mapped = value.map((child, index) =>
    mappedValue(nested(input, String(index), child)),
  );

  return unchanged(value, mapped) ? value : mapped;
}

function mappedObject(input: NestedInput): PluginProp {
  const { value } = input;

  if (value === null || typeof value !== 'object') return value;

  return mappedEntries(input, value);
}

function mappedEntries(
  input: NestedInput,
  value: Record<string, WireJson> | WireJson[],
): PluginProp {
  const entries = Object.entries(value);

  const mapped = entries.map(([name, child]) =>
    mappedValue(nested(input, name, child)),
  );

  if (unchanged(Object.values(value), mapped)) return value;

  return Object.fromEntries(
    entries.map(([name], index) => [name, mapped[index]]),
  );
}

function unchanged(
  before: readonly PluginProp[],
  after: PluginProp[],
): boolean {
  return after.every((child, index) => Object.is(child, before[index]));
}

function nested(
  input: NestedInput,
  name: string,
  value: WireJson,
): NestedInput {
  return { ...input, value, path: [...input.path, name] };
}
