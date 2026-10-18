import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type PageProps = KitProps<'Page'> & {
  testID?: string;
  // A view's story can supply its narrow web header without a navigator.
  renderHeader?: (page: PageProps) => ReactNode;
};
