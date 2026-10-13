import type { JSX, ReactNode } from 'react';
import { Text } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';

interface StatusTextProps {
  children: ReactNode;
  role?: 'badge' | 'secondary' | 'body' | 'title' | 'heading';
  className?: string;
}

export function StatusText({
  children,
  role = 'secondary',
  className,
}: StatusTextProps): JSX.Element {
  return (
    <Text
      selectable={false}
      role={role}
      className={cn('select-none', className)}
    >
      {children}
    </Text>
  );
}
