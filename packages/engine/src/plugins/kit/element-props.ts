import { kitComponentEvents } from '@repo/contracts/plugins/kit';
import { componentEventRules, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { Prop, Props } from './wire-tree';

// What React hands the reconciler: a Plugin's props, plus `children` and the `argoKey` the JSX runtime adds.
export interface ElementProps {
  children?: ReactNode;
  renderItem?: (item: WireJson, index: number) => ReactNode;
  [name: string]:
    | Prop
    | ElementProps
    | ReactNode
    | ((item: WireJson, index: number) => ReactNode);
}

function isProp(value: ElementProps[string]): value is Prop {
  if (typeof value === 'function') return true;

  return isPropData(value);
}

// Handlers go only in top-level props, so nested data is plain JSON.
function isPropData(value: ElementProps[string]): boolean {
  if (Array.isArray(value)) return value.every(isPropData);

  if (value === null) return true;

  return isPropScalar(value);
}

function isPropScalar(value: Exclude<ElementProps[string], null>): boolean {
  if (typeof value === 'object') return isPropObject(value);

  return WireJson.safeParse(value).success;
}

function isPropObject(
  value: Extract<NonNullable<ElementProps[string]>, object>,
): boolean {
  return (
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(isPropData)
  );
}

const reserved = new Set(['children', 'argoKey']);

function checked(
  type: string,
  name: string,
  value: ElementProps[string],
): Prop {
  if (!isProp(value))
    throw new Error(
      `${type}: prop ${name} must be JSON or a top-level function`,
    );

  return value;
}

const isPlainObject = (value: unknown): value is ElementProps =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

type EventPlace = { name: string; within: string };

// The Component events whose schema keeps their handler inside a prop object, such as a Picker's `footerAction.onPress`.
const eventPlaces = (type: string): EventPlace[] =>
  Object.entries(kitComponentEvents(type)).flatMap(([name, schema]) => {
    const { within } = componentEventRules(schema);

    return within === undefined ? [] : [{ name, within }];
  });

/*
 * A handler written inside its prop object runs as the node's event of that name: the one nested place a function is
 * allowed. The Plugin runtime holds it at the node's top level, and the wire puts it back inside (wire-tree).
 */
function liftedEvent(raw: ElementProps, place: EventPlace): ElementProps {
  const holder = raw[place.within];

  if (!isPlainObject(holder) || typeof holder[place.name] !== 'function')
    return raw;

  const rest = Object.fromEntries(
    Object.entries(holder).filter(([name]) => name !== place.name),
  );

  return { ...raw, [place.name]: holder[place.name], [place.within]: rest };
}

const liftedEvents = (type: string, raw: ElementProps): ElementProps =>
  eventPlaces(type).reduce(liftedEvent, raw);

// Keeps the props that cross the wire: drops `children`, the key and `undefined`.
export function toProps(type: string, source: ElementProps): Props {
  const raw = liftedEvents(type, source);

  return Object.fromEntries(
    Object.entries(raw)
      .filter(([name, value]) => !reserved.has(name) && value !== undefined)
      .map(([name, value]) => [
        name === 'argoText' ? 'children' : name,
        checked(type, name, value),
      ]),
  );
}

export function keyOfProps(raw: ElementProps): string | undefined {
  const { argoKey } = raw;

  return typeof argoKey === 'string' ? argoKey : undefined;
}
