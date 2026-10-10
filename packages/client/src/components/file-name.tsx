import type * as React from 'react';
import { Platform } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';

export function FileName({
  path,
  className,
}: {
  path: string;
  className?: string;
}): React.JSX.Element {
  const underlineColor = useCSSVariable('--color-ring');
  return (
    <Text
      selectable={false}
      numberOfLines={1}
      style={Platform.select({
        native: {
          textDecorationLine: 'underline',
          textDecorationColor: String(underlineColor),
        },
      })}
      className={cn(
        'select-none min-w-0 shrink type-code web:underline web:decoration-ring web:underline-offset-2',
        className,
      )}
    >
      {path.split('/').at(-1)}
    </Text>
  );
}
