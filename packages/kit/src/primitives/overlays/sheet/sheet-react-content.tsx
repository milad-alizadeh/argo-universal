import type { ReactElement, ReactNode } from 'react';
import { InsideHostContext } from '#primitives/native/host';

/*
 * A sheet opened from inside a FieldGroup's native tree (a Picker's `page`) draws its presentation straight into
 * that tree. What it holds is React Native again, whose kit Hosts must draw trees of their own.
 */
export function ReactContent(props: { children: ReactNode }): ReactElement {
  return (
    <InsideHostContext.Provider value={false}>
      {props.children}
    </InsideHostContext.Provider>
  );
}
