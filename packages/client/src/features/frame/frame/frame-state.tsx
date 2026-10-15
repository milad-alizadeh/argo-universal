import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { InspectorControl } from '#lib/product/inspector';
import { InspectorPane } from '../components/inspector-pane';
import type { InspectorState } from '../scaffold/scaffold';

function useInspectorControl(
  inspectorState: InspectorState,
  setInspectorState: (state: InspectorState) => void,
): InspectorControl {
  const inspectorOpen = inspectorState !== 'closed';

  return useMemo(
    () => ({
      open: inspectorOpen,
      toggle: (): void => setInspectorState(inspectorOpen ? 'closed' : 'open'),
    }),
    [inspectorOpen, setInspectorState],
  );
}

interface FrameScaffoldState {
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  inspector: (expanded: boolean) => ReactNode;
}

// The Inspector shows the open Session's changes.
const changesInspector =
  (onStateChange: (state: InspectorState) => void) =>
  (expanded: boolean): ReactNode => (
    <InspectorPane
      title="Changes"
      expanded={expanded}
      onStateChange={onStateChange}
    >
      {null}
    </InspectorPane>
  );

// The sidebar's and the Inspector's state.
function useScaffoldState(): FrameScaffoldState {
  const [sidebarShown, onSidebarShownChange] = useState(true);

  const [inspectorState, onInspectorStateChange] =
    useState<InspectorState>('closed');

  return {
    sidebarShown,
    onSidebarShownChange,
    inspectorState,
    onInspectorStateChange,
    inspector: changesInspector(onInspectorStateChange),
  };
}

export interface FrameState {
  scaffold: FrameScaffoldState;
  // For a page's header button, such as Changes, to open and close the Inspector.
  inspector: InspectorControl;
}

export function useFrameState(): FrameState {
  const scaffold = useScaffoldState();

  return {
    scaffold,
    inspector: useInspectorControl(
      scaffold.inspectorState,
      scaffold.onInspectorStateChange,
    ),
  };
}
