import { createContext, use } from 'react';
import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#kit/utils';
import { Button } from '#primitives/actions/button';
import type { ButtonProps } from '#primitives/actions/button';
import { useInCentredOverlay } from '#primitives/overlays/centred-overlay';
import { useDialogState } from './dialog-context';

// A centred dialog lines its actions up at the trailing edge; a sheet stacks them, the main action on top.
export function DialogFooter({
  className,
  ...props
}: ViewProps): React.JSX.Element {
  return <View className={useFooterClass(className)} {...props} />;
}

function useFooterClass(className: string | undefined): string {
  const centred = useInCentredOverlay();

  return cn(
    'flex gap-2',
    centred ? 'flex-row justify-end' : 'flex-col-reverse',
    className,
  );
}

const PinnedContext = createContext(false);

// Marks the actions a phone's sheet pins under its FieldGroup, where Cancel is the text look beneath the main action, as a request sheet's Skip is.
export const PinnedActions = (props: {
  children: React.ReactNode;
}): React.JSX.Element => <PinnedContext value>{props.children}</PinnedContext>;

// The dialog's own dismiss action, drawn as the same Button as its other actions so they share shape and height.
export function DialogCancel(
  props: Omit<ButtonProps, 'onPress' | 'variant' | 'fullWidth'>,
): React.JSX.Element {
  const { onOpenChange } = useDialogState();
  const centred = useInCentredOverlay();
  const pinned = use(PinnedContext);

  return (
    <Button
      {...props}
      variant={pinned ? 'text' : 'secondary'}
      fullWidth={!centred}
      onPress={() => onOpenChange(false)}
    />
  );
}
