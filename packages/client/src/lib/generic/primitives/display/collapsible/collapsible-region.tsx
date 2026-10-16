import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { cloneElement, type ReactElement } from 'react';
import type { CollapsibleContentProps } from './collapsible-props';
import { useStateData } from './collapsible-state-data';

// The open content's region: Radix names it and wires it to its trigger; the child's own props win.
export function CollapsibleRegion(props: {
  contentProps: Omit<CollapsibleContentProps, 'children'>;
  children: ReactElement<CollapsibleContentProps>;
}): ReactElement {
  const own = props.children.props;
  const region = { ...props.contentProps, ...own, ...useStateData() };

  return (
    <RadixCollapsible.Content forceMount asChild>
      {cloneElement(props.children, region)}
    </RadixCollapsible.Content>
  );
}
