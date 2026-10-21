import { createContext, use, type ReactElement, type ReactNode } from 'react';
import {
  ActionListHeaderContext,
  type HeaderSink,
} from '#primitives/actions/action-list';

const PageHeaderSink = createContext<HeaderSink | undefined>(undefined);

export const PageHeaderSinkProvider = PageHeaderSink;

// Hands its ActionLists to the enclosing Page's header; outside a Page they draw where they are.
export function PageHeaderActions(props: {
  children: ReactNode;
}): ReactElement {
  return (
    <ActionListHeaderContext value={use(PageHeaderSink)}>
      {props.children}
    </ActionListHeaderContext>
  );
}
