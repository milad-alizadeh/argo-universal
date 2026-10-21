import type { ReactElement, ReactNode } from 'react';
import { Text } from '#primitives/content/text';

export function PreviewSecondary({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <Text {...secondaryProps}>{children}</Text>;
}

const secondaryProps = {
  role: 'secondary',
  tone: 'muted',
  numberOfLines: 1,
  className: 'min-w-0 flex-1',
} as const;
