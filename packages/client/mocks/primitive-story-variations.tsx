import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '../src/lib/utils';
import { Text } from '../src/primitives/text';

export function Variation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
}) {
  return (
    <View className={cn('w-full max-w-xl gap-6', className)}>{children}</View>
  );
}
