import { WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { Prop, Props } from './wire-tree';

// What React hands the reconciler: a Plugin's props, plus `children` and the `argoKey` the JSX runtime adds.
export interface ElementProps {
  children?: ReactNode;
  renderItem?: (item: WireJson, index: number) => ReactNode;
  [name: string]:
    | Prop
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

// Keeps the props that cross the wire: drops `children`, the key and `undefined`.
export function toProps(type: string, raw: ElementProps): Props {
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
