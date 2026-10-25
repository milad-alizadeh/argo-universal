import * as React from 'react';
import type { ElementProps } from './element-props';
import { expandList } from './list-props';

const rejected = ['className', 'style'];

// The kit components that take their visible text as children.
const textual = new Set(['Text']);

function textOf(children: React.ReactNode): string {
  return [children]
    .flat()
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');
}

function rejectStyling(type: string, props: ElementProps): void {
  const name = rejected.find((candidate) => candidate in props);

  if (name)
    throw new Error(`${type}: ${name} is not allowed on Plugin components`);
}

// Element props such as `leading` become children of a `#slot` node, which the wire carries as a named slot.
function isElementArray(
  name: string,
  value: ElementProps[string],
): value is React.ReactNode[] {
  if (!Array.isArray(value)) return false;

  const elements = value.filter((child) => !isEmptyChild(child));

  return (
    hasElementMeaning(name, elements.length) &&
    elements.every(React.isValidElement)
  );
}

const isSlotValue = (
  name: string,
  value: ElementProps[string],
): value is React.ReactElement | React.ReactNode[] =>
  React.isValidElement(value) || isElementArray(name, value);

function slotsOf(props: ElementProps): React.ReactElement[] {
  return Object.entries(props).flatMap(([name, value]) =>
    isSlotValue(name, value)
      ? [React.createElement('#slot', { argoKey: name, key: name }, value)]
      : [],
  );
}

const plainOf = (props: ElementProps): ElementProps =>
  Object.fromEntries(
    Object.entries(props).filter(([name, value]) => !isSlotValue(name, value)),
  );

function textProp(type: string, children: React.ReactNode): ElementProps {
  return textual.has(type) && children !== undefined
    ? { argoText: textOf(children) }
    : {};
}

function prepare(
  type: string,
  props: ElementProps,
  key?: string | number,
): ElementProps {
  rejectStyling(type, props);
  const { children, ...rest } = expandList(type, props);
  const slots = slotsOf(rest);

  return {
    ...plainOf(rest),
    ...textProp(type, children),
    argoKey: key === undefined ? undefined : String(key),
    children: textual.has(type) ? slots : [children, slots].flat(),
  };
}

// A kit component that carries members, as `List` carries `List.Section`, with the wire type it stands for.
type KitComponent = React.ComponentType<ElementProps>;

const kitParts = new WeakMap<KitComponent, string>();

export function registerKitPart(component: KitComponent, part: string): void {
  kitParts.set(component, part);
}

type ElementType = React.ComponentType<ElementProps> | string;

// A kit component is its wire type, so its author key reaches the node; any other component renders itself.
const wireType = (type: ElementType): string | undefined =>
  typeof type === 'string' ? type : kitParts.get(type);

function create(
  type: ElementType,
  props: ElementProps,
  key?: string | number,
): React.ReactElement {
  const wire = wireType(type);

  if (wire === undefined) return React.createElement(type, { ...props, key });

  return React.createElement(wire, { ...prepare(wire, props, key), key });
}

export const jsx = create;

export const jsxs = create;

// Empty named Slots remain slots; other empty arrays can be ordinary JSON data.
const hasElementMeaning = (name: string, length: number): boolean =>
  length > 0 || slotNames.has(name);

const slotNames = new Set([
  'leading',
  'media',
  'accessories',
  'trailing',
  'meta',
  'empty',
  'footer',
  'detail',
]);

const isEmptyChild = (value: ElementProps[string]): boolean =>
  value === null || value === undefined || typeof value === 'boolean';
