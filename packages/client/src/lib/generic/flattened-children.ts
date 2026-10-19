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

export function flattenedChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!fragmentChild(child)) return [child];

    return flattenedChildren(child.props.children).map((nested, index) =>
      nestedKey(nested, String(child.key), index),
    );
  });
}
