import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import type { WindowBandSession } from '#lib/product/window-band';
import type { BandRef } from '../hooks/band-motion-types';
import { BandCapsule } from './band-capsule';
import { bandToggleAppearance } from './band-control-appearance';
import { movingPlace, pinnedRight, trailingPill } from './band-geometry';
import { bandGeometryInput, inBand } from './band-input';
import { workbenchDrawn } from './frame-layout';
import { inspectorOffered, moveInspector } from './inspector-column';
import type { PartReads, ScaffoldPartProps } from './use-scaffold-layout';

// A control over the Session reads the Session the page claimed beside the layout its pane is in.
type SessionReads = { session: WindowBandSession };

type WorkbenchReads = PartReads<
  'onWorkbenchIntentChange',
  'workbench' | 'setWorkbenchPopover'
> &
  SessionReads;

type ExpandReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band',
  'inspector'
>;

type InspectorToggleReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band' | 'inspectorAvailable',
  'inspector'
>;

// As Codex's summary panel: on a page that holds the Workbench the toggle sets the person's intent; on a narrower one it opens and closes the Workbench over the content and leaves the intent alone.
function toggleWorkbench({ scaffold, layout }: WorkbenchReads): void {
  const visible = workbenchDrawn(layout.workbench.state);

  if (layout.workbench.fits)
    scaffold.onWorkbenchIntentChange(visible ? 'hidden' : 'shown');
  else layout.setWorkbenchPopover(!visible);
}

function workbenchProps(parts: WorkbenchReads): IconButtonProps {
  const visible = workbenchDrawn(parts.layout.workbench.state);

  return {
    ...bandToggleAppearance(visible),
    icon: 'workbench',
    accessibilityLabel: 'Toggle Workbench',
    disabled: !parts.session.workbench,
    onPress: () => toggleWorkbench(parts),
  };
}

function expandProps({ scaffold, layout }: ExpandReads): IconButtonProps {
  const expanded = layout.inspector.expanded;

  return {
    ...bandToggleAppearance(expanded),
    icon: expanded ? 'collapse' : 'expand',
    accessibilityLabel: expanded ? 'Restore Inspector' : 'Expand Inspector',
    disabled: !layout.inspector.open,
    onPress: () => moveInspector(scaffold, { expanded: !expanded }),
  };
}

function inspectorToggleProps(parts: InspectorToggleReads): IconButtonProps {
  const { scaffold, layout } = parts;
  const open = layout.inspector.open;

  return {
    ...bandToggleAppearance(open),
    icon: 'stage',
    accessibilityLabel: open ? 'Hide Inspector' : 'Show Inspector',
    disabled: !open && !inspectorOffered(scaffold),
    onPress: () => moveInspector(scaffold, 'toggle'),
  };
}

// The shown page's buttons lead the window's own, then the Workbench toggle where a Session owns it: these ride the Inspector's edge.
function MovingControls(parts: ScaffoldPartProps): ReactNode {
  const band = parts.scaffold.band;
  const session = band?.session;

  return (
    <>
      {band?.actions}
      {session ? (
        <IconButton {...workbenchProps({ ...parts, session })} />
      ) : null}
    </>
  );
}

const hasControls = ({
  scaffold,
}: Pick<ScaffoldPartProps, 'scaffold'>): boolean =>
  Boolean(scaffold.band?.session ?? scaffold.band?.actions);

type MovingProps = ScaffoldPartProps & { movingRef: BandRef };

// Reports the moving buttons' width, which the closed Inspector's capsule closes round.
function reportWidth(
  layout: Pick<ScaffoldPartProps['layout'], 'movingWidth' | 'setMovingWidth'>,
) {
  return ({ nativeEvent }: LayoutChangeEvent): void => {
    if (nativeEvent.layout.width !== layout.movingWidth)
      layout.setMovingWidth(nativeEvent.layout.width);
  };
}

/*
 * The page's buttons and the Workbench toggle start the open Inspector's top row, inside the panel's edge, and sit
 * before the pinned pair on the closed Inspector's capsule, sliding between the two as the Inspector moves.
 */
function MovingGroup({ movingRef, ...parts }: MovingProps): ReactElement {
  return (
    <View
      ref={movingRef}
      testID="window-band-trailing"
      pointerEvents="box-none"
      className="absolute bottom-0 top-0 flex-row items-center gap-1"
      style={movingPlace(bandGeometryInput(parts))}
      onLayout={reportWidth(parts.layout)}
    >
      <MovingControls {...parts} />
    </View>
  );
}

// Expand and the Inspector toggle keep one place in the window, open or closed, at the panes' right edge.
function PinnedGroup(parts: ScaffoldPartProps): ReactElement | null {
  if (!parts.scaffold.band?.session) return null;

  return (
    <View
      testID="window-band-pinned"
      pointerEvents="box-none"
      className="absolute bottom-0 top-0 flex-row items-center gap-1"
      style={{ right: pinnedRight(bandGeometryInput(parts)) }}
    >
      <IconButton {...expandProps(parts)} />
      <IconButton {...inspectorToggleProps(parts)} />
    </View>
  );
}

function TrailingCapsule(parts: ScaffoldPartProps): ReactElement | null {
  const pill = trailingPill(bandGeometryInput(parts));

  if (parts.layout.inspector.open || !pill) return null;

  return (
    <BandCapsule side="trailing" box={inBand(pill, parts.layout.safeTop)} />
  );
}

/*
 * The page's buttons and the Session's panel controls float on a capsule at the title bar's end while the Inspector
 * is closed, mirroring the sidebar's, and sit in the open Inspector's top row, which the title bar above it lets
 * presses through to.
 */
export function BandTrailing(props: MovingProps): ReactElement | null {
  if (!hasControls(props)) return null;

  return (
    <>
      <TrailingCapsule {...props} />
      <MovingGroup {...props} />
      <PinnedGroup {...props} />
    </>
  );
}

// The open Inspector's top row, on the title bar's line, which the title bar's trailing group draws its buttons over.
export function InspectorTitleBar(parts: ScaffoldPartProps): ReactElement {
  return (
    <View
      testID="inspector-title-bar"
      className="shrink-0"
      style={{ height: parts.layout.measures.titleBarHeight }}
    />
  );
}
