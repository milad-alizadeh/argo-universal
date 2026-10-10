import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../src/lib/generic/primitives/text';
import { cn } from '../src/lib/generic/utils';

export function Variation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="gap-3">
      <Text variant="muted">{label}</Text>
      {children}
    </View>
  );
}

export function Variations({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <View className={cn('w-full max-w-xl gap-6', className)}>{children}</View>
  );
}
