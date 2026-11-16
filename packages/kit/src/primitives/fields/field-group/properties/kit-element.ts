import { isValidElement, type ReactElement, type ReactNode } from 'react';

// Any kit component, whatever props it takes: a read-only FieldGroup reads its rows and values by the component drawn.
export type KitComponent = (props: never) => ReactNode;

// The node is an element of that kit component, so its props are that component's.
export const isElementOf = <Props>(
  node: ReactNode,
  type: KitComponent,
): node is ReactElement<Props> => isValidElement(node) && node.type === type;
