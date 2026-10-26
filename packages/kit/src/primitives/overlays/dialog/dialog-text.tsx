import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#kit/utils';
import { DialogDescriptionText, DialogTitleText } from './dialog-parts';
import type { DialogTextProps } from './dialog-props';

export function DialogHeader({
  className,
  ...props
}: ViewProps): React.JSX.Element {
  return (
    <View
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

export function DialogTitle(props: DialogTextProps): React.JSX.Element {
  return (
    <DialogTitleText className={cn('type-heading', props.className)}>
      {props.children}
    </DialogTitleText>
  );
}

export function DialogDescription(props: DialogTextProps): React.JSX.Element {
  return (
    <DialogDescriptionText className={cn('type-secondary', props.className)}>
      {props.children}
    </DialogDescriptionText>
  );
}
