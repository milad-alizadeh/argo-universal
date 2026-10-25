import type { ReactElement, ReactNode } from 'react';
import { Host, InsideHostContext } from '#primitives/native/host';
import { ListEmpty } from './list-data';
import type { PhoneGroupedProps } from './list-phone-props';
import { phoneSections, type PhoneSection } from './list-phone-sections';

const fill = { flex: 1 };

// The one Host of a phone's grouped List; its rows are FieldGroup rows, which draw into it.
function PhoneHost(props: { children: ReactNode }): ReactElement {
  return (
    <Host style={fill}>
      <InsideHostContext.Provider value>
        {props.children}
      </InsideHostContext.Provider>
    </Host>
  );
}

type PhoneGroupedFrameProps = {
  list: PhoneGroupedProps;
  // The platform's native list of the sections.
  children: (sections: PhoneSection[]) => ReactNode;
};

// A phone's grouped List: its empty state when no section has rows, otherwise the platform's list in the Host.
export function PhoneGroupedFrame(props: PhoneGroupedFrameProps): ReactNode {
  const sections = phoneSections(props.list.children);

  if (sections.length === 0) return <ListEmpty empty={props.list.empty} />;

  return <PhoneHost>{props.children(sections)}</PhoneHost>;
}
