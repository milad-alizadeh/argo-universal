import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type { JSX, ReactNode } from 'react';

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
