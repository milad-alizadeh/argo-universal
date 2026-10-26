import { createPlace, useClaimed, type Place } from '@repo/kit/place';
import {
  InspectorPane,
  type InspectorProps,
} from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  createWindowBandPlaces,
  type WindowBandPlaces,
  type WindowBandView,
  useWindowBandView,
} from '#lib/product/window-band';
import {
  hostedChange,
  hostedInspectorState,
  moveInspector,
} from '../scaffold/inspector-column';
import type { InspectorState, WorkbenchIntent } from '../scaffold/scaffold';

// The Scaffold's props that the Frame holds, as state: the rest come from the shown section.
interface HeldScaffoldProps {
  band?: WindowBandView | null;
  workbenchIntent: WorkbenchIntent;
  onWorkbenchIntentChange: (intent: WorkbenchIntent) => void;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  inspectorAvailable: boolean;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  inspector: (expanded: boolean) => ReactNode;
}

// Whether the open Inspector fills the detail area; each opening starts beside the page.
function useExpanded(open: boolean): [boolean, (expanded: boolean) => void] {
  const [expanded, setExpanded] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  if (wasOpen !== open) {
    setWasOpen(open);

    if (!open) setExpanded(false);
  }

  return [expanded, setExpanded];
}

type ShownInspector = Pick<
  HeldScaffoldProps,
  | 'inspectorAvailable'
  | 'inspectorState'
  | 'onInspectorStateChange'
  | 'inspector'
>;

// The hosted Inspector's pane, whose expand moves the Frame's column between open and expanded.
const hostedPane =
  (hosted: InspectorProps | null, column: HostedColumn) =>
  (fills: boolean): ReactNode =>
    hosted && (
      <InspectorPane
        {...hosted}
        expanded={fills}
        onExpandedChange={(expanded) => moveInspector(column, { expanded })}
      />
    );

type HostedColumn = Pick<
  HeldScaffoldProps,
  'inspectorState' | 'onInspectorStateChange'
>;

// The page holds its Inspector open; the Frame holds its expansion.
function useHostedColumn(hosted: InspectorProps | null): HostedColumn {
  const open = hosted?.open === true;
  const [expanded, setExpanded] = useExpanded(open);

  return {
    inspectorState: hostedInspectorState(open, expanded),
    onInspectorStateChange: (state) => {
      const change = hostedChange(open, state);
      setExpanded(change.expanded);

      if (change.open !== null) hosted?.onOpenChange(change.open);
    },
  };
}

// The shown page's Inspector in the Frame's column.
function useShownInspector(hosted: InspectorProps | null): ShownInspector {
  const column = useHostedColumn(hosted);

  return {
    ...column,
    inspectorAvailable: hosted !== null,
    inspector: hostedPane(hosted, column),
  };
}

export interface FrameState {
  bandPlaces: WindowBandPlaces;
  scaffold: HeldScaffoldProps;
  // The column the shown page's Inspector draws in.
  inspectorPlace: Place<InspectorProps>;
}

// The sidebar's state, and the Inspector the shown page holds.
export function useFrameState(): FrameState {
  const [sidebarShown, onSidebarShownChange] = useState(true);
  const [inspectorPlace] = useState(() => createPlace<InspectorProps>());
  const { bandPlaces, ...band } = useBandState();

  return {
    bandPlaces,
    scaffold: {
      ...band,
      sidebarShown,
      onSidebarShownChange,
      ...useShownInspector(useClaimed(inspectorPlace) ?? null),
    },
    inspectorPlace,
  };
}

function useBandState(): Pick<
  HeldScaffoldProps,
  'band' | 'workbenchIntent' | 'onWorkbenchIntentChange'
> & { bandPlaces: WindowBandPlaces } {
  const [bandPlaces] = useState(createWindowBandPlaces);

  const [workbenchIntent, onWorkbenchIntentChange] =
    useState<WorkbenchIntent>('auto');

  return {
    bandPlaces,
    band: useWindowBandView(bandPlaces),
    workbenchIntent,
    onWorkbenchIntentChange,
  };
}
