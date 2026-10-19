import type { KitProps } from '../../kit-props';

/*
 * Kit-only: test identity, and a desktop sidebar row's meta item (Paper "SessionsList"): its glyph 4 from its text,
 * and a medium weight for the item that leads, such as a PR's number.
 */
export type LabelProps = KitProps<'Label'> & {
  testID?: string;
  sidebar?: boolean;
  emphasized?: boolean;
};
