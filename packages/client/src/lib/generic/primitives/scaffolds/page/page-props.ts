import type { KitProps } from '../../kit-props';
import type { PageActions } from './use-page-actions';

// Kit-only, as `testID`. `onBack` draws a wide drill-in page's Back; a phone's stack header draws its own.
export type PageProps = KitProps<'Page'> & {
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};

// What a Page's header pieces draw from: its props and the one registry its ActionLists join.
export type PageHeaderInput = PageProps & { header: PageActions };
