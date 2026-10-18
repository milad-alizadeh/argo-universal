import { WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { Prop, Props } from './wire-tree';

// What React hands the reconciler: a Plugin's props, plus `children` and the `argoKey` the JSX runtime adds.
export interface ElementProps {
  children?: ReactNode;
  renderItem?: (item: WireJson) => ReactNode;
  [name: string]: Prop | ReactNode | ((item: WireJson) => ReactNode);
}

const isProp = (value: ElementProps[string]): value is Prop =>
  typeof value === 'function' || WireJson.safeParse(value).success;

const reserved = new Set(['children', 'argoKey']);

function checked(
  type: string,
  name: string,
  value: ElementProps[string],
): Prop {
  if (!isProp(value))
    throw new Error(`${type}: prop ${name} must be JSON or a function`);

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
