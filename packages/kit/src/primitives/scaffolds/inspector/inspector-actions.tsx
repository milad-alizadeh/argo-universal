import type { ReactNode } from 'react';
import { ActionListHeaderContext } from '#primitives/actions/action-list';

// The Inspector's own Actions draw in its header, never in the Screen header around it.
export function InspectorActions(props: { children: ReactNode }): ReactNode {
  if (!props.children) return null;

  return (
    <ActionListHeaderContext value={undefined}>
      {props.children}
    </ActionListHeaderContext>
  );
}
