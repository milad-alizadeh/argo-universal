import type * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#kit/utils';
import {
  CentredModalDescription,
  CentredModalTitle,
} from '#primitives/overlays/centred-overlay';
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
    <CentredModalTitle className={cn('type-heading', props.className)}>
      {props.children}
    </CentredModalTitle>
  );
}

export function DialogDescription(props: DialogTextProps): React.JSX.Element {
  return (
    <CentredModalDescription className={cn('type-secondary', props.className)}>
      {props.children}
    </CentredModalDescription>
  );
}
