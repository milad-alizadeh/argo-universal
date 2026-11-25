import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from './flattened-children';
import { kitTypeOf } from './wrapped-component';

type KitType = ReactElement['type'];

/*
 * How a kit component reads its children by type. Every parent that does goes through here, so a Fragment opens in
 * place and a wrapper that draws a kit component in its place (the App's comment target, a Draft's frame) is read as
 * that component. Never compare an element's `type` or call `kitTypeOf` in a parent: ask this module.
 */

// Whether a node is an element of this kit component, or a wrapper drawn in its place.
export function isKitElement<Props = unknown>(
  node: ReactNode,
  type: KitType,
): node is ReactElement<Props> {
  return isValidElement(node) && kitTypeOf(node) === type;
}

// The kit component an element is read as, or undefined for a node that is not an element.
export function kitElementType(node: ReactNode): KitType | undefined {
  return isValidElement(node) ? kitTypeOf(node) : undefined;
}

// The children that are of this kit component, in order, with Fragments opened and anything else left out.
export function kitChildrenOf<Props = unknown>(
  children: ReactNode,
  type: KitType,
): ReactElement<Props>[] {
  return flattenedChildren(children).filter(
    (child): child is ReactElement<Props> => isKitElement<Props>(child, type),
  );
}
