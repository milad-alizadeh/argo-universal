import { WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { Prop, Props } from './wire-tree';

// What a Render's JSX hands the kit: a Plugin's props, plus `children` and the `argoKey` the JSX runtime adds.
export interface ElementProps {
  children?: ReactNode;
  renderItem?: (item: WireJson, index: number) => ReactNode;
  [name: string]:
    | Prop
    | ElementProps
    | ReactNode
    | ((item: WireJson, index: number) => ReactNode);
}

// A prop is plain JSON all the way down.
function isPropData(value: ElementProps[string]): value is WireJson {
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

// A Component event holds a value (ADR-0050), so a function prop is the Plugin's mistake, named in its terms.
function checked(
  type: string,
  name: string,
  value: ElementProps[string],
): Prop {
  if (typeof value === 'function')
    throw new Error(`A Render passes values, not functions: ${name}`);

  if (!isPropData(value)) throw new Error(`${type}: prop ${name} must be JSON`);

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
