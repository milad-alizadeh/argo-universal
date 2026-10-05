import type { ShellHeaderContentProps } from './ShellHeaderContent';
import { useShellHeaderMotion } from './useShellHeaderMotion.web';

export function ShellHeaderContent({
  inset,
  testID,
  animate = true,
  position = inset,
  transitionKey = String(inset),
  children,
}: ShellHeaderContentProps) {
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
