import type { KitProps } from '../../kit-props';

// Kit-only, as `testID`. `onBack` draws a wide drill-in page's Back; a phone's stack header draws its own.
export type PageProps = KitProps<'Page'> & {
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onBack?: () => void;
};
