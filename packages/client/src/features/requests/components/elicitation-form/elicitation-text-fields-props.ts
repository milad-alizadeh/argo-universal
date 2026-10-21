import type { ListSectionProps } from '@repo/kit/primitives/lists/list';
import type { ReactNode } from 'react';

// Fields to type in, kept apart from the rows; a phone's section footer carries their hint or error.
export type TextFieldsProps = Pick<ListSectionProps, 'footer' | 'tone'> & {
  children: ReactNode;
};
