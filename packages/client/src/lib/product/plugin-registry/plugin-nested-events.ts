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

  if (Array.isArray(value))
    return value.map((child, index) =>
      mappedValue(nested(input, String(index), child)),
    );

  return mappedObject(input);
}

function mappedObject(input: NestedInput): PluginProp {
  const { value } = input;

  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([name, child]) => [
      name,
      mappedValue(nested(input, name, child)),
    ]),
  );
}

function nested(
  input: NestedInput,
  name: string,
  value: WireJson,
): NestedInput {
  return { ...input, value, path: [...input.path, name] };
}
