import {
  type InspectorHost,
  InspectorHostContext,
} from '@repo/kit/primitives/scaffolds/inspector';
import { createContext, use, type ReactNode } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';

// The Frame's Inspector column, which the shown page's Inspector draws in on a wide window.
export const FrameInspectorHost = createContext<InspectorHost | undefined>(
  undefined,
);

// Offers the Frame's Inspector column to a page while it is the one shown; a page under it in its stack keeps out.
export function ScreenInspector(props: {
  children: ReactNode;
}): React.JSX.Element {
  const host = use(FrameInspectorHost);
  const focused = useScreenFocused();

  return (
    <InspectorHostContext value={focused ? host : undefined}>
      {props.children}
    </InspectorHostContext>
  );
}
