import type { KitProps } from '../../kit-props';

/*
 * Kit-only: test identity, and `inline` for a Callout that always draws in place on a card, as a Plugin page's error
 * does; without it a phone presents the Callout as a bottom sheet.
 */
export type CalloutProps = KitProps<'Callout'> & {
  testID?: string;
  inline?: boolean;
};
