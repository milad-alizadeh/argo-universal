import type * as React from 'react';
import { cn } from '#kit/utils';

const placeholderClassName =
  'pointer-events-none absolute inset-x-0 top-0 truncate type-control text-placeholder';

export function Placeholder({
  text,
  className,
}: {
  text: string;
  className?: string;
}): React.JSX.Element {
  return <div className={cn(placeholderClassName, className)}>{text}</div>;
}
