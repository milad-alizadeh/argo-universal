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

// Children as one flat list, as a kit component reads its children and plural Slots. Fragments, written by a screen or wrapping a Slot of several nodes, open in place, and nested keys take the Fragment's key as a prefix so they stay unique.
export function flattenedChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!fragmentChild(child)) return [child];

    return flattenedChildren(child.props.children).map((nested, index) =>
      nestedKey(nested, String(child.key), index),
    );
  });
}
