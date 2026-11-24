import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';

function fragmentChild(
  child: ReactNode,
): child is ReactElement<{ children?: ReactNode }> {
  return (
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
  );
}

function nestedKey(child: ReactNode, prefix: string, index: number): ReactNode {
  return isValidElement(child)
    ? cloneElement(child, { key: `${prefix}/${child.key ?? index}` })
    : child;
}

const flatNodes = Symbol('flatNodes');

export interface FlatChildren extends Iterable<ReactNode> {
  [flatNodes]: ReactNode[];
}

const isFlat = (children: ReactNode): children is FlatChildren =>
  typeof children === 'object' && children !== null && flatNodes in children;

/*
 * Nodes a caller already holds as one flat list, each with its own key: `flattenedChildren` returns them as they are,
 * where it would copy every element to key it. It is iterable, so it is also valid children for anything that reads
 * children as React does. The contract: every node has its own unique key, and no node is a Fragment.
 */
export function flatChildren(nodes: ReactNode[]): FlatChildren {
  const flat: FlatChildren = {
    [flatNodes]: nodes,
    [Symbol.iterator]: () => nodes[Symbol.iterator](),
  };

  return flat;
}

// Children as one flat list, as a kit component reads its children and plural Slots. Fragments, written by a screen or wrapping a Slot of several nodes, open in place, and nested keys take the Fragment's key as a prefix so they stay unique.
export function flattenedChildren(children: ReactNode): ReactNode[] {
  if (isFlat(children)) return children[flatNodes];

  return Children.toArray(children).flatMap((child) => {
    if (!fragmentChild(child)) return [child];

    return flattenedChildren(child.props.children).map((nested, index) =>
      nestedKey(nested, String(child.key), index),
    );
  });
}
