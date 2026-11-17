import type { ReactElement, ReactNode } from 'react';
import { OutsideColumn } from '#kit/content-column/content-column';
import { Host, InsideHostContext } from '#primitives/native/host';

interface AsideHostProps {
  // The rows' height when the drawing inside reports it; the Host otherwise takes its contents' height.
  height?: number;
  children: ReactNode;
}

/*
 * The native Host an aside's FieldGroup draws in: as wide as the aside and as tall as its rows, so it scrolls with
 * the aside or the body that holds it, and outside the Screen's column.
 */
export function AsideHost({ height, children }: AsideHostProps): ReactElement {
  const sized = height === undefined;

  return (
    <Host
      matchContents={sized ? { vertical: true } : undefined}
      style={{ width: '100%', height }}
    >
      <InsideHostContext.Provider value>
        <OutsideColumn>{children}</OutsideColumn>
      </InsideHostContext.Provider>
    </Host>
  );
}
