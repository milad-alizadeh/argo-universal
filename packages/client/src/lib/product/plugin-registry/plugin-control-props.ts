import type { PartBinding } from '@repo/contracts/plugins/kit';
import { Handler, type WireJson } from '@repo/contracts/plugins/wire';
import { controlCallback, controlEvent } from './plugin-control-events';
import type {
  ControlInput,
  EventInput,
  LocalControl,
  PluginProp,
  PluginProps,
} from './plugin-control-types';

export function controlProps(
  input: ControlInput,
  local: LocalControl,
): PluginProps {
  const props = Object.fromEntries(
    Object.entries(input.node.props).map(([name, value]) => [
      name,
      mappedValue(value, { ...input, path: [name] }, local),
    ]),
  );

  for (const binding of input.ui.bindings)
    applyBinding({ input, local, props }, binding);
  local.state.pendingProps(input.ui, props);

  return props;
}

function mappedValue(
  value: WireJson,
  input: EventInput,
  local: LocalControl,
): PluginProp {
  const event = controlEvent(input);

  if (!input.part.events[event]) return mappedContent(value, input, local);
  const handler = Handler.safeParse(value);

  return handler.success
    ? controlCallback({ ...input, handler: handler.data }, local)
    : value;
}

function mappedContent(
  value: WireJson,
  input: EventInput,
  local: LocalControl,
): PluginProp {
  if (Array.isArray(value))
    return value.map((child, index) =>
      mappedValue(child, nested(input, String(index)), local),
    );

  return mappedObject(value, input, local);
}

function mappedObject(
  value: WireJson,
  input: EventInput,
  local: LocalControl,
): PluginProp {
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([name, child]) => [
      name,
      mappedValue(child, nested(input, name), local),
    ]),
  );
}

function nested(input: EventInput, name: string): EventInput {
  return { ...input, path: [...input.path, name] };
}

type BindingInput = {
  input: ControlInput;
  local: LocalControl;
  props: PluginProps;
};

function applyBinding(
  { input, local, props }: BindingInput,
  binding: PartBinding,
): void {
  props[binding.prop] = local.state.value(
    binding,
    input.node.props[binding.prop],
  );
  props[binding.event] ??= controlCallback(
    { ...input, path: [binding.event] },
    local,
  );

  if (binding.protectFocus)
    Object.assign(props, focusCallbacks({ input, local, props }, binding));
}

function focusCallbacks(
  { input, local }: BindingInput,
  binding: PartBinding,
): PluginProps {
  return {
    onFocus: () => local.state.hold(binding, input.node.props[binding.prop]),
    onBlur: () => {
      local.state.focus(false);
      local.update();
    },
  };
}
