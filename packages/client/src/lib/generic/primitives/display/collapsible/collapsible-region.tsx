import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import type { ReactElement } from 'react';
import type { CollapsibleContentProps } from './collapsible-props';

// The open content's region: the web primitive names it and wires it to its trigger.
export function CollapsibleRegion(props: {
  contentProps: Omit<CollapsibleContentProps, 'children'>;
  children: ReactElement;
}): ReactElement {
  return (
    <CollapsiblePrimitive.Content {...props.contentProps} forceMount asChild>
      {props.children}
    </CollapsiblePrimitive.Content>
  );
}
