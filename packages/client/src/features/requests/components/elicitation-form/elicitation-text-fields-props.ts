import type { ReactNode } from 'react';
import type { GroupedListSectionProps } from '#primitives/lists/grouped-list-section';

// Fields to type in, kept apart from the rows; a phone's section footer carries their hint or error.
export type TextFieldsProps = Pick<
  GroupedListSectionProps,
  'footer' | 'tone'
> & {
  children: ReactNode;
};
