import type { ContentHeader } from '#kit/content-header';
import type { KitProps } from '../../kit-props';
import type { ScreenHeader } from './use-screen-header';

// Kit-only, as `testID`. `onBack` draws a wide drill-in page's Back; a phone's stack header draws its own.
export type ScreenProps = KitProps<'Screen'> & {
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};

// What a Screen's header pieces draw from: its props and the Actions they declare, read once.
export type ScreenHeaderInput = ScreenProps & {
  header: ScreenHeader;
  contentHeader?: ContentHeader | null;
};
