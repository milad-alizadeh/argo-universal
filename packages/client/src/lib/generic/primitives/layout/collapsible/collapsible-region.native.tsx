import type { ReactElement } from 'react';
import type { CollapsibleContentProps } from './collapsible-props';

// Phones need no region wrapper: the moving view already hides closed content from assistive technology.
export function CollapsibleRegion(props: {
  contentProps: Omit<CollapsibleContentProps, 'children'>;
  children: ReactElement;
}): ReactElement {
  return props.children;
}
