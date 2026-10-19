import type { KitProps } from '../../kit-props';
import type { PageActions } from './use-page-actions';

export type PageProps = KitProps<'Page'> & {
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

// What the Page's header pieces draw: its props and the Actions gathered for its header.
export type PageHeaderInput = PageProps & { header: PageActions };
