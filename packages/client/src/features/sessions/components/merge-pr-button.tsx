import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import { SplitButton } from '#primitives/buttons/split-button';
import type { MenuAction } from '#primitives/overlays/menu';

export type MergeMethod = 'squash' | 'merge' | 'rebase';

const mergeMethods = [
  { method: 'squash', label: 'Squash and merge' },
  { method: 'merge', label: 'Create a merge commit' },
  { method: 'rebase', label: 'Rebase and merge' },
] as const satisfies readonly { method: MergeMethod; label: string }[];

export interface MergePrButtonProps {
  // False until the PR can merge: checks pass and nothing conflicts.
  mergeable: boolean;
  // Absent while the Server has no way to merge; the button then stays dimmed.
  onMerge?: (method: MergeMethod) => void;
}

function mergeMethodActions(
  onMerge: MergePrButtonProps['onMerge'],
): MenuAction[] {
  return mergeMethods.map(({ method, label }) => ({
    label,
    onSelect: () => onMerge?.(method),
  }));
}

const mergeAppearance = {
  appearance: 'content',
  size: 'xs',
  icon: 'merged',
  label: 'Merge PR',
  className: 'web:shadow-none',
} as const;

const mergeSplit = {
  size: 'xs',
  primary: true,
  menuLabel: 'Merge options',
} as const;

// "Merge PR" with a menu of merge methods on its chevron; dimmed until the PR can merge.
export function MergePrButton(props: MergePrButtonProps): React.JSX.Element {
  const disabled = !props.mergeable || !props.onMerge;

  return (
    <SplitButton
      {...mergeSplit}
      {...{ disabled, actions: mergeMethodActions(props.onMerge) }}
    >
      <Button
        {...mergeAppearance}
        disabled={disabled}
        onPress={() => props.onMerge?.('squash')}
      />
    </SplitButton>
  );
}
