import type * as React from 'react';
import type { ShellHeaderActionsProps } from './shell-header-actions';
import { useShellHeaderMotion } from './use-shell-header-motion.web';

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
