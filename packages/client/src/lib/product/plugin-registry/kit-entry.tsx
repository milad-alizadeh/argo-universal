import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import {
  Action,
  WireEvent,
  WireJson,
  type Handler,
} from '@repo/contracts/plugins/wire';
import { createElement, useState, type ElementType } from 'react';
import { z } from 'zod';
import { deliverControl } from './plugin-control-state';
import { entry, type RenderContext } from './plugin-rendering';

const objectProps = z.record(z.string(), z.json());

type BoundValue =
  | string
  | number
  | boolean
  | null
  | BoundValue[]
  | { [name: string]: BoundValue }
  | ((value?: string) => void);

type Drafts = ReadonlyMap<string, string>;

interface Binding {
  events: Record<string, z.ZodType>;
  context: RenderContext;
  path: string[];
  drafts: Drafts;
  change: (path: string, value: string) => void;
}

// Schema-owned props, nested handlers, and Slots all reach the real kit part through this entry.
export function kitEntry(
  part: WirePartDefinition,
  component: ElementType,
): ReturnType<typeof entry> {
  return entry(part.props, (props, context, children) => (
    <KitPart
      component={component}
      events={part.events}
      props={objectProps.parse(props)}
      context={context}
    >
      {children}
    </KitPart>
  ));
}

interface KitPartProps {
  component: ElementType;
  events: Record<string, z.ZodType>;
  props: Record<string, WireJson>;
  context: RenderContext;
  children: React.ReactNode;
}

function KitPart({
  component,
  events,
  props,
  context,
  children,
}: KitPartProps): React.JSX.Element {
  const state = useDraftBindings();
  const bound = bindObject(props, { context, events, path: [], ...state });

  return createElement(component, { ...bound, ...context.slots }, children);
}

function bindObject(
  props: Record<string, WireJson>,
  binding: Binding,
): Record<string, BoundValue> {
  const result = Object.fromEntries(
    Object.entries(props).map(([name, value]) => [
      name,
      bindValue(value, { ...binding, path: [...binding.path, name] }),
    ]),
  );

  const draft = binding.drafts.get(JSON.stringify(binding.path));

  return draft === undefined ? result : { ...result, value: draft };
}

function bindValue(value: WireJson, binding: Binding): BoundValue {
  if (typeof value !== 'object') return value;

  return bindStructured(value, binding);
}

function bindStructured(
  value: Extract<WireJson, object> | null,
  binding: Binding,
): BoundValue {
  if (value === null) return null;

  if (Array.isArray(value))
    return value.map((child, index) =>
      bindValue(child, { ...binding, path: [...binding.path, String(index)] }),
    );

  return bindHandler(value, binding);
}

function bindHandler(
  value: Record<string, WireJson>,
  binding: Binding,
): BoundValue {
  const handler = WireEvent.or(Action).safeParse(value);

  if (!handler.success) return bindObject(value, binding);

  return (payload?: string): void =>
    deliverBound(handler.data, binding, eventValue(binding, payload));
}

function eventValue(
  binding: Binding,
  input: string | undefined,
): WireJson | undefined {
  const event = eventSchema(binding);

  if (!event) return undefined;

  if (event instanceof z.ZodUndefined) return undefined;

  return WireJson.parse(event.parse(input));
}

function deliverBound(
  handler: Handler,
  binding: Binding,
  payload: WireJson | undefined,
): void {
  recordDraft(binding, payload);

  const interaction = {
    event: 'onAction',
    payload: { path: binding.path, value: payload },
  } as const;

  void Promise.resolve(
    deliverControl(handler, interaction, binding.context),
  ).catch(() => {});
}

function recordDraft(binding: Binding, value: WireJson | undefined): void {
  if (binding.path.at(-1) !== 'onChangeText') return;

  if (typeof value !== 'string') return;

  binding.change(JSON.stringify(binding.path.slice(0, -1)), value);
}

function useDraftBindings(): Pick<Binding, 'drafts' | 'change'> {
  const [drafts, setDrafts] = useState<Drafts>(() => new Map());

  const change = (path: string, value: string): void =>
    setDrafts((previous) => new Map(previous).set(path, value));

  return { drafts, change };
}

function eventSchema(binding: Binding): z.ZodType | undefined {
  const name = binding.path.at(-1);

  return name ? binding.events[name] : undefined;
}
