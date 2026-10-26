import type { ReactElement, ReactNode } from 'react';
import { useClaimColumn } from '#kit/content-column/content-column';
import { Host, InsideHostContext } from '#primitives/native/host';
import { ListEmpty } from './list-data';
import type { NativeGroupedProps } from './list-native-props';
import { nativeSections, type NativeSection } from './list-native-sections';

const fill = { flex: 1 };

/*
 * The one Host of a native grouped List; its rows are FieldGroup rows, which draw into it. Its cards keep the
 * platform's own inset, so it claims the Screen's column as grouped cards, and the Screen adds no gutter of its own.
 */
function NativeHost(props: { children: ReactNode }): ReactElement {
  useClaimColumn('grouped');

  return (
    <Host style={fill}>
      <InsideHostContext.Provider value>
        {props.children}
      </InsideHostContext.Provider>
    </Host>
  );
}

type NativeGroupedFrameProps = {
  list: NativeGroupedProps;
  // The platform's native list of the sections.
  children: (sections: NativeSection[]) => ReactNode;
};

// A native grouped List: its empty state when no section has rows, otherwise the platform's list in the Host.
export function NativeGroupedFrame(props: NativeGroupedFrameProps): ReactNode {
  const sections = nativeSections(props.list.children);

  if (sections.length === 0) return <ListEmpty empty={props.list.empty} />;

  return <NativeHost>{props.children(sections)}</NativeHost>;
}
