import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonGroup } from '#primitives/buttons/button-group/button-group';
import { Button } from '#primitives/buttons/button/button';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';
import { Menu, type MenuAction } from '#primitives/overlays/menu/menu';

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

// The group dims as one, so its buttons do not dim a second time.
const undimmed = 'opacity-100';

interface MergeControlProps {
  disabled: boolean;
  onMerge?: (method: MergeMethod) => void;
}

const mergeDivider = (
  <View className="h-7 w-px justify-center bg-primary">
    <View className="h-3.5 bg-primary-foreground/25" />
  </View>
);

function mergeMethodAction(
  { method, label }: (typeof mergeMethods)[number],
  onMerge: MergeControlProps['onMerge'],
): MenuAction {
  return { label, onSelect: () => onMerge?.(method) };
}

const mergeOptionsAppearance = {
  variant: 'filled',
  size: 'sm',
  icon: 'chevron-down',
  accessibilityLabel: 'Merge options',
  className: cn('rounded-l-none sm:w-6', undimmed),
} as const;

function MergeMethodsMenu(props: MergeControlProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel={mergeOptionsAppearance.accessibilityLabel}
      disabled={props.disabled}
      align="end"
      actions={mergeMethods.map((choice) =>
        mergeMethodAction(choice, props.onMerge),
      )}
      trigger={
        <IconButton {...mergeOptionsAppearance} disabled={props.disabled} />
      }
    />
  );
}

const mergeAppearance = {
  appearance: 'content',
  size: 'xs',
  icon: 'merged',
  label: 'Merge PR',
  className: cn('web:shadow-none', undimmed),
} as const;

function groupClassName(disabled: boolean): string {
  return cn('rounded-md web:shadow-xs', disabled && 'opacity-35');
}

// "Merge PR" with a menu of merge methods on its chevron; dimmed until the PR can merge.
export function MergePrButton(props: MergePrButtonProps): React.JSX.Element {
  const disabled = !props.mergeable || !props.onMerge;

  return (
    <ButtonGroup className={groupClassName(disabled)}>
      <Button
        {...mergeAppearance}
        disabled={disabled}
        onPress={() => props.onMerge?.('squash')}
      />
      {mergeDivider}
      <MergeMethodsMenu disabled={disabled} onMerge={props.onMerge} />
    </ButtonGroup>
  );
}
