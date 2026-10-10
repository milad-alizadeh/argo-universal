import type * as React from 'react';
import { useShellHeaderMotion } from '../hooks/use-shell-header-motion.web';
import type { ShellHeaderActionsProps } from './shell-header-actions';

export function ShellHeaderActions({
  position,
  transitionKey,
  animate,
  testID,
  children,
}: ShellHeaderActionsProps): React.JSX.Element {
  const element = useShellHeaderMotion(position, transitionKey, animate);
  return (
    <div
      ref={element}
      data-testid={testID}
      className="flex shrink-0 items-center gap-0.5"
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
