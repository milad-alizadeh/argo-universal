import { isValidElement, type ReactElement, type ReactNode } from 'react';

const markOf = (name: string): symbol => Symbol.for(`argo.kit.${name}`);

/*
 * A parent that reads its children by type, as a FieldGroup reads its Sections and a Section its inline Pickers, cannot
 * compare against the component it imported: a hot reload runs that component's file again, and a caller that was not
 * run again still builds elements of the function from before. The mark is a global symbol on the component, so the
 * function from before and the one from after both carry it.
 */
export function markedComponent<Component extends object>(
  name: string,
  component: Component,
): Component {
  Object.defineProperty(component, markOf(name), {
    value: true,
    configurable: true,
  });

  return component;
}

// Only a component can carry the mark: a host component's type is a string, and Suspense or StrictMode a symbol.
const isMarkable = (type: unknown): type is object =>
  typeof type === 'function' || (typeof type === 'object' && type !== null);

export function isMarkedElement<Props>(
  name: string,
  node: ReactNode,
): node is ReactElement<Props> {
  return (
    isValidElement(node) && isMarkable(node.type) && markOf(name) in node.type
  );
}
