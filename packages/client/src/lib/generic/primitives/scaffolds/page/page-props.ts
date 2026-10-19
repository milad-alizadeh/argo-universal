import type { KitProps } from '../../kit-props';

export type PageProps = KitProps<'Page'> & {
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};
