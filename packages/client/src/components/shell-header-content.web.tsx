import type * as React from 'react';
import type { ShellHeaderContentProps } from './shell-header-content';
import { useShellHeaderMotion } from './use-shell-header-motion.web';

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
