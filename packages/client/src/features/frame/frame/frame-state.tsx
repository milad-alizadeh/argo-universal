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
  SessionMemory,
  useSessionMemory,
} from '../../../lib/product/session-memory';
import {
  hostedChange,
  hostedInspectorState,
  moveInspector,
} from '../scaffold/inspector-column';
import type { InspectorState, WorkbenchIntent } from '../scaffold/scaffold';
import { useExpanded } from './frame-session-expansion';

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
function useHostedColumn(
  hosted: InspectorProps | null,
  sessionId: string | undefined,
): HostedColumn {
  const open = hosted?.open === true;
  const [expanded, setExpanded] = useExpanded(open, sessionId);

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
function useShownInspector(
  hosted: InspectorProps | null,
  sessionId: string | undefined,
): ShownInspector {
  const column = useHostedColumn(hosted, sessionId);

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
const bandSessionId = (
  band: WindowBandView | null | undefined,
): string | undefined => band?.session?.sessionId;

export function useFrameState(): FrameState {
  const [inspectorPlace] = useState(() => createPlace<InspectorProps>());
  const { bandPlaces, ...band } = useBandState();

  return {
    bandPlaces,
    inspectorPlace,
    scaffold: useFrameScaffold(band, inspectorPlace),
  };
}

function useFrameScaffold(
  band: Omit<ReturnType<typeof useBandState>, 'bandPlaces'>,
  inspectorPlace: Place<InspectorProps>,
): HeldScaffoldProps {
  const [sidebarShown, onSidebarShownChange] = useState(true);
  const hosted = useClaimed(inspectorPlace) ?? null;
  const inspector = useShownInspector(hosted, bandSessionId(band.band));

  return { ...band, sidebarShown, onSidebarShownChange, ...inspector };
}

const workbenchMemory = new SessionMemory<WorkbenchIntent>('auto');

function useBandState(): Pick<
  HeldScaffoldProps,
  'band' | 'workbenchIntent' | 'onWorkbenchIntentChange'
> & { bandPlaces: WindowBandPlaces } {
  const [bandPlaces] = useState(createWindowBandPlaces);

  const band = useWindowBandView(bandPlaces);

  const [workbenchIntent, onWorkbenchIntentChange] = useWorkbenchIntent(band);

  return {
    bandPlaces,
    band,
    workbenchIntent,
    onWorkbenchIntentChange,
  };
}

function useWorkbenchIntent(
  band: WindowBandView | null,
): [WorkbenchIntent, (intent: WorkbenchIntent) => void] {
  const sessionId = bandSessionId(band);
  const remembered = useSessionMemory(workbenchMemory, sessionId ?? '');
  const local = useState<WorkbenchIntent>('auto');

  return sessionId === undefined ? local : remembered;
}
