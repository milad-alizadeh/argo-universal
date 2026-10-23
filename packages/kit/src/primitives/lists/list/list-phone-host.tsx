import type { ReactElement, ReactNode } from 'react';
import { Host, InsideHostContext } from '#primitives/native/host';

const fill = { flex: 1 };

// The one Host of a phone's grouped List; its rows are FieldGroup rows, which draw into it.
export function PhoneHost(props: { children: ReactNode }): ReactElement {
  return (
    <Host style={fill}>
      <InsideHostContext.Provider value>
        {props.children}
      </InsideHostContext.Provider>
    </Host>
  );
}
