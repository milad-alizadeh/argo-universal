import type { KitProps } from '../../kit-props';

// Kit-only: test identity.
export type LabelProps = KitProps<'Label'> & { testID?: string };
