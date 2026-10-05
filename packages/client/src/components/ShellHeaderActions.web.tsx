import type { ShellHeaderActionsProps } from './ShellHeaderActions';
import { useShellHeaderMotion } from './useShellHeaderMotion.web';

export function ShellHeaderActions({
  position,
  transitionKey,
  animate,
  testID,
  children,
}: ShellHeaderActionsProps) {
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
