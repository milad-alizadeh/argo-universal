import { createContext, useContext, type ReactElement } from 'react';
import { Host } from './host';

const NativeControlContext = createContext(false);

export function NativeControl({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  return <NativeControlContext value>{children}</NativeControlContext>;
}

export function ControlHost({
  children,
  ...props
}: React.ComponentProps<typeof Host>): React.ReactNode {
  return useContext(NativeControlContext) ? (
    children
  ) : (
    <Host {...props}>{children}</Host>
  );
}
