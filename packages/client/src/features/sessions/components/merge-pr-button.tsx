// jscpd:ignore-start -- only the import list matches session-pull-request.tsx; no logic is shared.
import type * as React from 'react';
import { View } from 'react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#lib/generic/primitives/dropdown-menu';
import { Pressable } from '#lib/generic/primitives/pressable';
import { Text } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../../lib/generic/symbols/icon';
// jscpd:ignore-end

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

const halfClassName =
  'h-7 flex-row items-center justify-center web:outline-none web:hover:bg-primary-foreground/10 web:focus-visible:bg-primary-foreground/15 active:bg-primary-foreground/15';

// "Merge PR" with a menu of merge methods on its chevron; dimmed until the PR can merge.
export function MergePrButton({
  mergeable,
  onMerge,
}: MergePrButtonProps): React.JSX.Element {
  const disabled = !mergeable || !onMerge;
  return (
    <View
      className={cn(
        'h-7 flex-row items-center overflow-hidden rounded-md bg-primary shadow-sm',
        disabled && 'opacity-35',
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Merge PR"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onMerge?.('squash')}
        className={cn(halfClassName, 'gap-1.5 px-1.5')}
      >
        <Icon name="merged" size="sm" className="text-primary-foreground" />
        <Text role="control" className="text-primary-foreground">
          Merge PR
        </Text>
      </Pressable>
      <View className="h-3.5 w-px bg-primary-foreground/25" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Merge options"
            accessibilityState={{ disabled }}
            disabled={disabled}
            className={cn(halfClassName, 'w-6')}
          >
            <Icon
              name="chevron-down"
              size="xs"
              className="text-primary-foreground"
            />
          </Pressable>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {mergeMethods.map(({ method, label }) => (
            <DropdownMenuItem key={method} onPress={() => onMerge?.(method)}>
              <Text>{label}</Text>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </View>
  );
}
