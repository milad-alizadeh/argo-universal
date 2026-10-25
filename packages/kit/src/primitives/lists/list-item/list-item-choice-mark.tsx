import type { ReactNode } from 'react';
import { SelectedCheck } from '#primitives/status/selected-check';
import type { ListItemProps } from './list-item-props';

export type ChoiceMarkProps = Pick<ListItemProps, 'selected' | 'disabled'> & {
  // Several rows can be chosen, so Android draws a box where a single choice draws a radio button.
  multiple?: boolean;
};

export function ChoiceMark(props: ChoiceMarkProps): ReactNode {
  return props.selected ? <SelectedCheck /> : null;
}
