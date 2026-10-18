import type { KitProps } from '../../kit-props';

// Kit-only: test identity.
export type CalloutProps = KitProps<'Callout'> & { testID?: string };
