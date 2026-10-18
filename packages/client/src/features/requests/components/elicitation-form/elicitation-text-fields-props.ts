import type { ReactNode } from 'react';
import type { ListSectionProps } from '#primitives/lists/list';

// Fields to type in, kept apart from the rows; a phone's section footer carries their hint or error.
export type TextFieldsProps = Pick<ListSectionProps, 'footer' | 'tone'> & {
  children: ReactNode;
};
