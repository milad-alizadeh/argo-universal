import type { JSX, ReactNode } from 'react';
import { cn } from '#lib/generic/utils';
import { Text } from '#primitives/content/text';

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
