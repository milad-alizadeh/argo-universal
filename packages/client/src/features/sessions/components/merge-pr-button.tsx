import type * as React from 'react';
import { View } from 'react-native';
import { ButtonGroup } from '#lib/generic/primitives/buttons/button-group/button-group';
import { IconButton } from '#lib/generic/primitives/buttons/icon-button/icon-button';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#lib/generic/primitives/overlays/dropdown-menu/dropdown-menu';
import { cn } from '#lib/generic/utils';
import { Button } from '../../../lib/generic/primitives/buttons/button/button';

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

// "Merge PR" with a menu of merge methods on its chevron; dimmed until the PR can merge.
export function MergePrButton({
  mergeable,
  onMerge,
}: MergePrButtonProps): React.JSX.Element {
  const disabled = !mergeable || !onMerge;
  return (
    <ButtonGroup
      className={cn('rounded-md web:shadow-xs', disabled && 'opacity-35')}
    >
      <Button
        appearance="content"
        size="xs"
        icon="merged"
        label="Merge PR"
        disabled={disabled}
        onPress={() => onMerge?.('squash')}
        className={cn('web:shadow-none', undimmed)}
      />
      <View className="h-7 w-px justify-center bg-primary">
        <View className="h-3.5 bg-primary-foreground/25" />
      </View>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <IconButton
            variant="filled"
            size="sm"
            icon="chevron-down"
            iconSize="sm"
            accessibilityLabel="Merge options"
            disabled={disabled}
            className={cn('rounded-l-none sm:w-6', undimmed)}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {mergeMethods.map(({ method, label }) => (
            <DropdownMenuItem key={method} onPress={() => onMerge?.(method)}>
              <Text>{label}</Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
