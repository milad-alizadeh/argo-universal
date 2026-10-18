import { PluginInteraction, WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';
import type {
  ControlChange,
  EventInput,
  LocalControl,
  PluginCallback,
} from './plugin-control-types';
import { deliverControl } from './plugin-delivery';

export function controlCallback(
  input: EventInput,
  local: LocalControl,
): PluginCallback {
  return (payload) => {
    const event = controlEvent(input);
    const schema = input.part.events[event];

    if (schema) parseChange({ ...input, event, payload }, schema, local);
  };
}

function parseChange(
  input: ControlChange,
  schema: z.ZodType,
  local: LocalControl,
): void {
  const parsed = schema
    .pipe(WireJson.optional())
    .safeParse(schema instanceof z.ZodUndefined ? undefined : input.payload);

  if (!parsed.success) return;

  const payload = parsed.data;

  const binding = bindingFor(input);
  void changeControl({ ...input, payload, binding }, local).catch(() => {});
}

function bindingFor(input: ControlChange): ControlChange['binding'] {
  if (input.path.length > 1) return undefined;

  return input.ui.bindings.find((binding) => binding.event === input.event);
}

async function changeControl(
  change: ControlChange,
  local: LocalControl,
): Promise<void> {
  if (local.state.blocked(change)) return;
  const draft = local.state.begin(change);
  local.update();

  await settleChange(change, { draft, local });
}

type Settlement = {
  draft: ReturnType<LocalControl['state']['begin']>;
  local: LocalControl;
};

async function settleChange(
  change: ControlChange,
  { draft, local }: Settlement,
): Promise<void> {
  try {
    await deliverChange(change);
    local.state.finish(change, draft, false);
  } catch (error) {
    local.state.finish(change, draft, true);
    throw error;
  } finally {
    local.update();
  }
}

async function deliverChange(change: ControlChange): Promise<void> {
  if (change.ui.flush.includes(change.event)) await change.context.ui.flush();
  await deliverControl({
    ...change,
    interaction: interactionFor(change),
    throttleMs: change.binding?.throttleMs,
  });
}

function interactionFor(change: ControlChange): PluginInteraction {
  const action: PluginInteraction = {
    event: 'onAction',
    payload: { path: change.path, value: change.payload },
  };

  if (change.path.length > 1) return action;
  const interaction = PluginInteraction.safeParse(eventProps(change));

  return interaction.success ? interaction.data : action;
}

function eventProps(
  change: ControlChange,
): Pick<ControlChange, 'event'> & Partial<Pick<ControlChange, 'payload'>> {
  if (change.payload === undefined) return { event: change.event };

  return { event: change.event, payload: change.payload };
}

export function controlEvent(input: Pick<EventInput, 'path'>): string {
  return input.path.at(-1) ?? '';
}
