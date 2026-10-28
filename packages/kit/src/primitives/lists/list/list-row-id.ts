import { isValidElement, type ReactNode } from 'react';

// A child's own `id`: the identity a ListItem's move reports, and a List.Section's.
export function rowIdOf(child: ReactNode): string | undefined {
  if (!isValidElement<{ id?: unknown }>(child)) return undefined;

  const { id } = child.props;

  return typeof id === 'string' ? id : undefined;
}
