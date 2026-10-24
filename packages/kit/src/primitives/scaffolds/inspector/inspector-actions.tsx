import type { ReactNode } from 'react';
import { ActionButtons } from '#primitives/actions/action';

// The Inspector's own Actions draw in its header, where it is; the Screen around it declares its own.
export function InspectorActions(props: { children: ReactNode }): ReactNode {
  if (!props.children) return null;

  return <ActionButtons actions={props.children} />;
}
