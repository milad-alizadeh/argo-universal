import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: the running submit (`loading`), and the centred dialog's Cancel.
export type FormProps = KitProps<'Form', string, ReactNode> & {
  loading?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
};
