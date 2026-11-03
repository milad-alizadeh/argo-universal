import { isValidElement, type ReactElement, type ReactNode } from 'react';

// What a row's content is drawn from: elements, the props they hold, and the values and callbacks inside those.
type Drawing =
  | ReactNode
  | DrawingProps
  | readonly Drawing[]
  | ((...input: never[]) => void);

interface DrawingProps {
  readonly [name: string]: Drawing;
}

// How deep the comparison follows props into elements, arrays and plain objects before it calls them different.
const depthLimit = 6;

const isProps = (value: Drawing): value is DrawingProps =>
  typeof value === 'object' &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

function sameList(
  first: readonly Drawing[],
  second: readonly Drawing[],
  depth: number,
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => sameDrawing(value, second[index], depth))
  );
}

function sameProps(
  first: DrawingProps,
  second: DrawingProps,
  depth: number,
): boolean {
  const names = Object.keys(first);

  return (
    names.length === Object.keys(second).length &&
    names.every(
      (name) => name in second && sameDrawing(first[name], second[name], depth),
    )
  );
}

function sameElements(
  first: ReactElement<DrawingProps>,
  second: ReactElement<DrawingProps>,
  depth: number,
): boolean {
  return (
    first.type === second.type &&
    first.key === second.key &&
    sameProps(first.props, second.props, depth)
  );
}

const sameElement = (first: Drawing, second: Drawing, depth: number): boolean =>
  isValidElement<DrawingProps>(first) &&
  isValidElement<DrawingProps>(second) &&
  sameElements(first, second, depth);

function sameObjects(first: Drawing, second: Drawing, depth: number): boolean {
  if (isProps(first)) return isProps(second) && sameProps(first, second, depth);

  return sameElement(first, second, depth);
}

function sameParts(first: Drawing, second: Drawing, depth: number): boolean {
  if (Array.isArray(first))
    return Array.isArray(second) && sameList(first, second, depth);

  return sameObjects(first, second, depth);
}

// The same value, or an element, array or plain object drawn from the same values: it draws as it did.
function sameDrawing(first: Drawing, second: Drawing, depth: number): boolean {
  if (Object.is(first, second)) return true;

  return depth < depthLimit && sameParts(first, second, depth + 1);
}

export const sameContent = (first: ReactNode, second: ReactNode): boolean =>
  sameDrawing(first, second, 0);
