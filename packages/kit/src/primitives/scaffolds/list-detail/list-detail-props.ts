import type { KitProps } from '../../kit-props';
import type { ScreenProps } from '../screen';

/*
 * `screen` is kit-only: the list's own Screen (title, search, Actions), which a wide window draws as the heading
 * above the list and a compact one as the list screen's header. `title` alone is a Plugin's way to name it.
 */
export type ListDetailProps = KitProps<'ListDetail'> & {
  testID?: string;
  screen?: Omit<ScreenProps, 'children'>;
};
