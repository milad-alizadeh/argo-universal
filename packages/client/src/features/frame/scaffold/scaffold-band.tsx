import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import { cn } from '@repo/kit/utils';
import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { BandCapsule } from './band-capsule';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { BandTrailing } from './scaffold-band-controls';
import type {
  PartReads,
  ScaffoldLayout,
  ScaffoldPartProps,
} from './use-scaffold-layout';
import { type HistoryStep, useWindowHistory } from './window-history';

interface SidebarToggleProps {
  layout: Pick<ScaffoldLayout, 'list' | 'requestSidebar'>;
}

function SidebarBandToggle({ layout }: SidebarToggleProps): ReactElement {
  const shown = !layout.list.folded;

  return (
    <IconButton
      {...bandToggleAppearance(shown)}
      icon="sidebar"
      accessibilityLabel={shown ? 'Hide sidebar' : 'Show sidebar'}
      onPress={() => layout.requestSidebar(!shown)}
    />
  );
}

// Each step's glyph and label.
const historySteps = {
  back: { icon: 'chevron-left', label: 'Back' },
  forward: { icon: 'chevron-right', label: 'Forward' },
} as const;

function HistoryButton(props: {
  step: HistoryStep;
  kind: keyof typeof historySteps;
}): ReactElement {
  const { icon, label } = historySteps[props.kind];

  return (
    <IconButton
      {...bandControlAppearance}
      icon={icon}
      accessibilityLabel={label}
      disabled={!props.step.enabled}
      onPress={props.step.go}
    />
  );
}

// Back and Forward step through the window's history, as a browser's own buttons do.
function BandHistory(): ReactElement | null {
  const history = useWindowHistory();

  if (!history) return null;

  return (
    <View className="flex-row items-center gap-1">
      <HistoryButton step={history.back} kind="back" />
      <HistoryButton step={history.forward} kind="forward" />
    </View>
  );
}

type BandLeadingReads = PartReads<
  'list',
  'bandLeading' | 'list' | 'requestSidebar' | 'measures'
>;

const sidebarControl = ({
  scaffold,
  layout,
}: BandLeadingReads): ReactElement | null =>
  scaffold.list ? <SidebarBandToggle layout={layout} /> : null;

// Back and Forward keep the same gap inside the open panel's trailing edge as the toggle's capsule keeps from the lights.
const panelEdgeGap = 4;

function LeadingGroup(props: {
  style: ViewStyle;
  spread?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <View
      testID="window-band-leading"
      className={cn(
        'shrink-0 flex-row items-center',
        props.spread && 'justify-between',
      )}
      style={props.style}
    >
      {props.children}
    </View>
  );
}

// The open sidebar's top row runs to the panel's trailing edge.
const panelRowStyle = ({ layout }: BandLeadingReads): ViewStyle => ({
  width: layout.measures.inset + layout.measures.railWidth + layout.list.width,
  paddingLeft: layout.bandLeading.toggle,
  paddingRight: panelEdgeGap,
});

function SidebarRow(parts: BandLeadingReads): ReactElement {
  return (
    <LeadingGroup style={panelRowStyle(parts)} spread>
      {sidebarControl(parts) ?? <View />}
      <BandHistory />
    </LeadingGroup>
  );
}

// Closed, the sidebar's controls gather in a capsule after the window buttons.
function LeadingCapsule(parts: BandLeadingReads): ReactElement {
  return (
    <LeadingGroup style={{ paddingLeft: parts.layout.bandLeading.capsule }}>
      <BandCapsule>
        {sidebarControl(parts)}
        <BandHistory />
      </BandCapsule>
    </LeadingGroup>
  );
}

// A page with no list keeps the rail alone under the title bar, with Back and Forward after the window buttons.
function ListlessLeading(parts: BandLeadingReads): ReactElement {
  return (
    <LeadingGroup style={{ paddingLeft: parts.layout.bandLeading.toggle }}>
      <BandHistory />
    </LeadingGroup>
  );
}

function BandLeading(parts: BandLeadingReads): ReactElement {
  if (!parts.scaffold.list) return <ListlessLeading {...parts} />;

  return parts.layout.list.folded ? (
    <LeadingCapsule {...parts} />
  ) : (
    <SidebarRow {...parts} />
  );
}

// The title bar's row, one inset below the window's top, which the window buttons share.
const bandStyle = ({ layout }: ScaffoldPartProps): ViewStyle => ({
  top: layout.safeTop,
  height: layout.panesTop,
  paddingTop: layout.measures.inset,
});

function BandRow({ children }: { children: ReactNode }): ReactElement {
  return (
    <View
      pointerEvents="box-none"
      className="flex-1 flex-row items-center pr-frame-inset"
    >
      {children}
    </View>
  );
}

// Touches between the controls reach the panes under the title bar, such as the Inspector's own top row.
export function ScaffoldBand(parts: ScaffoldPartProps): ReactElement {
  return (
    <FixedSizeChrome>
      <View
        testID="window-band"
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 z-50 web:[app-region:drag]"
        style={bandStyle(parts)}
      >
        <BandRow>
          <BandLeading {...parts} />
          <View pointerEvents="none" className="flex-1" />
          <BandTrailing {...parts} />
        </BandRow>
      </View>
    </FixedSizeChrome>
  );
}
