import type { ReactElement, ReactNode } from 'react';
import { OutsideColumn } from '#kit/content-column/content-column';
import { Host, InsideHostContext } from '#primitives/native/host';

/*
 * The native Host an aside's FieldGroup draws in: as wide as the aside and as tall as its rows, so it scrolls with
 * the aside or the body that holds it, and outside the Screen's column.
 */
export function AsideHost({ children }: { children: ReactNode }): ReactElement {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <InsideHostContext.Provider value>
        <OutsideColumn>{children}</OutsideColumn>
      </InsideHostContext.Provider>
    </Host>
  );
}
