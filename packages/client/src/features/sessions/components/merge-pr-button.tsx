import type * as React from 'react';
import { SplitButton } from '#primitives/actions/split-button';
import type { MergeMethod } from '../stores/merge-method';

const mergeMethodOptions = [
  { value: 'squash', label: 'Squash and merge' },
  { value: 'merge', label: 'Create a merge commit' },
  { value: 'rebase', label: 'Rebase and merge' },
] as const satisfies readonly { value: MergeMethod; label: string }[];

export interface MergePrButtonProps {
  // False until the Change can merge: checks pass and nothing conflicts.
  mergeable: boolean;
  // The method Merge runs, ticked in its menu.
  method: MergeMethod;
  onMethodChange: (method: MergeMethod) => void;
  // Absent while the Server has no way to merge; the button then stays dimmed.
  onMerge?: (method: MergeMethod) => void;
}

const mergeSplit = {
  label: 'Merge',
  icon: 'merged',
  size: 'xs',
  primary: true,
  menuLabel: 'Merge options',
  options: mergeMethodOptions,
} as const;

// "Merge" runs the ticked merge method; its chevron picks another, as GitHub's merge button does. Dimmed until the Change can merge.
export function MergePrButton(props: MergePrButtonProps): React.JSX.Element {
  const disabled = !props.mergeable || !props.onMerge;

  return (
    <SplitButton
      {...{ ...mergeSplit, disabled, value: props.method }}
      onValueChange={props.onMethodChange}
      onPress={() => props.onMerge?.(props.method)}
    />
  );
}
