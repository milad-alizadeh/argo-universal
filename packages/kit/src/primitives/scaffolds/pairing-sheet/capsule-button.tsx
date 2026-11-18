import type * as React from 'react';
import { cn } from '#kit/utils';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';

export interface CapsuleButtonProps {
  label: string;
  // The sheet's verb is black; every other answer is grey.
  variant?: 'primary' | 'secondary';
  onPress: () => void;
}

const looks = {
  primary: { fill: 'bg-foreground', label: 'text-card' },
  secondary: { fill: 'bg-muted', label: 'text-foreground' },
} as const;

const pill = 'h-13 items-center justify-center rounded-full active:opacity-80';

/*
 * The full-width pill a pairing sheet stacks its answers in. App-only: a Plugin's Button is the kit's own.
 */
export function CapsuleButton(props: CapsuleButtonProps): React.JSX.Element {
  const look = looks[props.variant ?? 'secondary'];

  return (
    <Pressable
      role="button"
      accessibilityLabel={props.label}
      className={cn(pill, look.fill)}
      onPress={props.onPress}
    >
      <Text role="nav-action" className={cn('font-semibold', look.label)}>
        {props.label}
      </Text>
    </Pressable>
  );
}
