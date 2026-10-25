import type * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cn } from '#kit/utils';
import {
  type IconSizeValue,
  useIconBox,
  useIconPixels,
} from '../../../symbols/icon-size';
import type { IconSlotProps, IconSpinnerProps } from './icon-props';
import { IconSizeProvider } from './icon-size-provider';

export function IconSpinner({
  iconSize,
  ...props
}: IconSpinnerProps): React.JSX.Element {
  return <ActivityIndicator {...props} size={useIconPixels(iconSize)} />;
}

export function IconSlot({
  size = 'sm',
  children,
  ...props
}: IconSlotProps): React.JSX.Element {
  return (
    <SlotBox {...props} size={size}>
      <IconSizeProvider size={size}>{children}</IconSizeProvider>
    </SlotBox>
  );
}

function SlotBox({
  size,
  className,
  ...props
}: IconSlotProps & { size: IconSizeValue }): React.JSX.Element {
  return (
    <View
      {...props}
      style={useIconBox(size)}
      className={cn('shrink-0 items-center justify-center', className)}
    />
  );
}
