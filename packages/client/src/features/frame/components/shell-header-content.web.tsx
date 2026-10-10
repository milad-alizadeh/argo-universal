import type * as React from 'react';
import { useShellHeaderMotion } from '../hooks/use-shell-header-motion.web';
import type { ShellHeaderContentProps } from './shell-header-content';

export function ShellHeaderContent({
  inset,
  testID,
  animate = true,
  position = inset,
  transitionKey = String(inset),
  children,
}: ShellHeaderContentProps): React.JSX.Element {
  const element = useShellHeaderMotion(position, transitionKey, animate);
  return (
    <div
      ref={element}
      data-testid={testID}
      className="min-w-0 flex-1"
      style={{ marginLeft: inset, willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
