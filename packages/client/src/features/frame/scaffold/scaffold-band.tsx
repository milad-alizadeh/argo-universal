import {
  FixedSizeChrome,
  IconButton,
} from '@repo/kit/primitives/actions/icon-button';
import { cn } from '@repo/kit/utils';
import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import type {
  BandPlace,
  BandRef,
  BandRefs,
} from '../hooks/band-motion-types';
import { useBandMotion } from '../hooks/use-band-motion';
import { BandCapsule, capsulePadding } from './band-capsule';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { BandTrailing, trailingCapsuleShown } from './scaffold-band-controls';
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

// Back and Forward keep the same gap inside the open panel's trailing edge as the toggle's capsule keeps from the lights.
const panelEdgeGap = 4;

function LeadingGroup(props: {
  motionRef: BandRef;
  style: ViewStyle;
  spread?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <View
      ref={props.motionRef}
      testID="window-band-leading"
      className={cn(
        'shrink-0 flex-row items-center gap-1',
        props.spread && 'justify-between',
      )}
      style={props.style}
    >
      {props.children}
    </View>
  );
}

/*
 * The sidebar's toggle keeps one place, open or closed: the open panel's top row runs to the panel's trailing edge,
 * with Back and Forward at its end, and the closed sidebar's capsule closes round the toggle where it stands, with Back
 * and Forward after it. The row's padding never changes, so no button jumps as the group's width moves.
 */
const sidebarRowStyle = ({ layout }: BandLeadingReads): ViewStyle => {
  const { toggle } = layout.bandLeading;

  const padding = { paddingLeft: toggle, paddingRight: panelEdgeGap };

  if (layout.list.folded) return padding;

  return {
    ...padding,
    width: layout.measures.inset + layout.measures.railWidth + layout.list.width,
  };
};

type BandLeadingProps = BandLeadingReads & { refs: BandRefs };

function SidebarLeading({ refs, ...parts }: BandLeadingProps): ReactElement {
  const { toggle } = parts.layout.bandLeading;

  return (
    <LeadingGroup motionRef={refs.leading} style={sidebarRowStyle(parts)} spread>
      <BandCapsule
        shown={parts.layout.list.folded}
        motionRef={refs.leadingCapsule}
        style={{
          left: toggle - capsulePadding,
          right: panelEdgeGap - capsulePadding,
        }}
      />
      <SidebarBandToggle layout={parts.layout} />
      <BandHistory />
    </LeadingGroup>
  );
}

// A page with no list keeps the rail alone under the title bar, with Back and Forward after the window buttons.
function ListlessLeading({ refs, ...parts }: BandLeadingProps): ReactElement {
  return (
    <LeadingGroup
      motionRef={refs.leading}
      style={{ paddingLeft: parts.layout.bandLeading.toggle }}
    >
      <BandHistory />
    </LeadingGroup>
  );
}

function BandLeading(parts: BandLeadingProps): ReactElement {
  return parts.scaffold.list ? (
    <SidebarLeading {...parts} />
  ) : (
    <ListlessLeading {...parts} />
  );
}

// The page's heading starts a little in from the page's edge beside an open sidebar, and 12 after the capsule's pill beside a closed one, which ends 2 inside its group.
const titleGaps = { besidePanel: 16, afterCapsule: 10, beforeControls: 8 };

type BandTitleReads = PartReads<
  'band',
  'list' | 'measures' | 'inspector' | 'page'
>;

// The heading ends where the page does, the pane gap short of an open Inspector, whose top row the trailing group spans.
const titlePlace = ({
  layout,
}: BandTitleReads): Pick<BandPlace, 'titleStart' | 'titleEnd'> => {
  const { inset, paneGap } = layout.measures;

  if (layout.page.hidden) return { titleStart: 0, titleEnd: 0 };

  return {
    titleStart: layout.list.folded
      ? titleGaps.afterCapsule
      : inset + titleGaps.besidePanel,
    titleEnd: titleGaps.beforeControls + (layout.inspector.open ? paneGap : 0),
  };
};

const titleSpan = (place: Pick<BandPlace, 'titleStart' | 'titleEnd'>): ViewStyle => ({
  paddingLeft: place.titleStart,
  paddingRight: place.titleEnd,
});

// The shown page's heading, as Claude's and Codex's windows title theirs: gone while an expanded Inspector covers the page.
function BandTitle({
  motionRef,
  ...parts
}: BandTitleReads & { motionRef: BandRef }): ReactElement {
  const title = parts.layout.page.hidden ? null : parts.scaffold.band?.title;

  return (
    <View
      ref={motionRef}
      testID="window-band-title"
      pointerEvents="box-none"
      className="min-w-0 flex-1 flex-row items-center"
      style={titleSpan(titlePlace(parts))}
    >
      {title ? <View className="min-w-0 flex-1">{title}</View> : null}
    </View>
  );
}

// Where the row puts each part, which moves on the panes' timing when the sidebar or the Inspector opens or closes.
const bandPlace = (parts: ScaffoldPartProps): BandPlace => ({
  ...titlePlace(parts),
  leadingCapsule: Boolean(parts.scaffold.list) && parts.layout.list.folded,
  trailingCapsule: trailingCapsuleShown(parts),
});

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
  const refs = useBandMotion({ ...parts.layout.motion, place: bandPlace(parts) });

  return (
    <FixedSizeChrome>
      <View
        testID="window-band"
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 z-50 web:[app-region:drag]"
        style={bandStyle(parts)}
      >
        <BandRow>
          <BandLeading {...parts} refs={refs} />
          <BandTitle {...parts} motionRef={refs.title} />
          <BandTrailing {...parts} refs={refs} />
        </BandRow>
      </View>
    </FixedSizeChrome>
  );
}
