import { useClaimed } from '@repo/kit/claim-store';
import {
  createInspectorHost,
  type InspectorHost,
  InspectorPane,
  type InspectorProps,
  useHostedInspector,
} from '@repo/kit/primitives/scaffolds/inspector';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  createWindowBandHost,
  type WindowBandHost,
  type WindowBandContent,
} from '#lib/product/window-band';
import type { InspectorState } from '../scaffold/scaffold';

interface FrameScaffoldState {
  band?: WindowBandContent | null;
  workbenchShown?: boolean;
  onWorkbenchShownChange: (shown: boolean) => void;
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

const inspectorStateOf = (open: boolean, expanded: boolean): InspectorState => {
  if (!open) return 'closed';

  return expanded ? 'expanded' : 'open';
};

type InspectorColumn = Omit<
  FrameScaffoldState,
  | 'sidebarShown'
  | 'onSidebarShownChange'
  | 'band'
  | 'workbenchShown'
  | 'onWorkbenchShownChange'
>;

// The hosted Inspector's pane, whose expand moves the Frame's column between open and expanded.
const hostedPane =
  (
    hosted: InspectorProps | null,
    onStateChange: (state: InspectorState) => void,
  ) =>
  (fills: boolean): ReactNode =>
    hosted && (
      <InspectorPane
        {...hosted}
        expanded={fills}
        onExpandedChange={(next) => onStateChange(next ? 'expanded' : 'open')}
      />
    );

// The shown page's Inspector in the Frame's column: the page holds it open; the Frame holds its expansion and width.
function useInspectorColumn(hosted: InspectorProps | null): InspectorColumn {
  const open = hosted?.open === true;
  const [expanded, setExpanded] = useExpanded(open);

  const onInspectorStateChange = (state: InspectorState): void => {
    setExpanded(state === 'expanded');

    if ((state !== 'closed') !== open) hosted?.onOpenChange(state !== 'closed');
  };

  return {
    inspectorAvailable: hosted !== null,
    inspectorState: inspectorStateOf(open, expanded),
    onInspectorStateChange,
    inspector: hostedPane(hosted, onInspectorStateChange),
  };
}

export interface FrameState {
  bandHost: WindowBandHost;
  scaffold: FrameScaffoldState;
  // The column the shown page's Inspector draws in.
  inspectorHost: InspectorHost;
}

// The sidebar's state, and the Inspector the shown page holds.
export function useFrameState(): FrameState {
  const [sidebarShown, onSidebarShownChange] = useState(true);
  const [inspectorHost] = useState(createInspectorHost);
  const { bandHost, ...band } = useBandState();

  return {
    bandHost,
    scaffold: {
      ...band,
      sidebarShown,
      onSidebarShownChange,
      ...useInspectorColumn(useHostedInspector(inspectorHost)),
    },
    inspectorHost,
  };
}

function useBandState(): Pick<
  FrameScaffoldState,
  'band' | 'workbenchShown' | 'onWorkbenchShownChange'
> & { bandHost: WindowBandHost } {
  const [bandHost] = useState(createWindowBandHost);
  const [workbenchShown, onWorkbenchShownChange] = useState<boolean>();

  return {
    bandHost,
    band: useClaimed(bandHost),
    workbenchShown,
    onWorkbenchShownChange,
  };
}
