import type { KitProps } from '../../kit-props';

// Kit-only: test identity.
export type TextAreaProps = KitProps<'TextArea'> & { testID?: string };
