import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: the running submit, and the centred dialog's Cancel.
export type FormProps = KitProps<'Form', string, ReactNode> & {
  submitting?: boolean;
  onCancel?: () => void;
  cancelLabel?: string;
};
