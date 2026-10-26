import type { SelectionMode } from '#kit/selection-mode';
import type { KitProps } from '../../kit-props';
import type { ScreenHeader } from './use-screen-header';

/*
 * Kit-only, as `testID`. `title` is optional here, where a page's header is empty until it has a name, as New Session's
 * is; a Plugin always names its screen. `onBack` draws a wide drill-in page's Back; a phone's stack header draws its own.
 */
export type ScreenProps = Omit<KitProps<'Screen'>, 'title'> & {
  title?: string;
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};

// What a Screen's header pieces draw from: its props and the Actions they declare, read once.
export type ScreenHeaderInput = ScreenProps & {
  header: ScreenHeader;
  selectionMode?: SelectionMode | null;
};
