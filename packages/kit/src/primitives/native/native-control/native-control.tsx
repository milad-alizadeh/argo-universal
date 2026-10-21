import { createContext, useContext, type ReactElement } from 'react';
import { Host } from '#primitives/native/host';

const NativeControlContext = createContext(false);

export function NativeControl({
  children,
}: {
  children: ReactElement;
}): ReactElement {
  return <NativeControlContext value>{children}</NativeControlContext>;
}

// A control never takes the safe area: scrolled under a clear header, SwiftUI would push it out of its own frame and leave it there.
export function ControlHost({
  children,
  ...props
}: React.ComponentProps<typeof Host>): React.ReactNode {
  return useContext(NativeControlContext) ? (
    children
  ) : (
    <Host ignoreSafeArea="all" {...props}>
      {children}
    </Host>
  );
}
