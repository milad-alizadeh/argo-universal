import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { WindowBandSession } from '#lib/product/window-band';
import type { BandRefs } from '../hooks/band-motion-types';
import { BandCapsule, capsulePadding } from './band-capsule';
import { bandToggleAppearance } from './band-control-appearance';
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

// The shown page's buttons lead the window's own, then Workbench and Expand where a Session owns them.
function PanelControls(parts: ScaffoldPartProps): ReactNode {
  const band = parts.scaffold.band;
  const session = band?.session;

  return (
    <>
      {band?.actions}
      {session ? <IconButton {...workbenchProps({ ...parts, session })} /> : null}
      {session ? <IconButton {...expandProps(parts)} /> : null}
    </>
  );
}

const hasControls = ({ scaffold }: Pick<ScaffoldPartProps, 'scaffold'>): boolean =>
  Boolean(scaffold.band?.session ?? scaffold.band?.actions);

type TrailingReads = Pick<ScaffoldPartProps, 'scaffold'> & {
  layout: Pick<ScaffoldPartProps['layout'], 'inspector'>;
};

// The closed Inspector's controls float on a capsule; the open Inspector's top row holds the same buttons.
export const trailingCapsuleShown = (parts: TrailingReads): boolean =>
  hasControls(parts) && !parts.layout.inspector.open;

// The open Inspector's top row keeps its buttons this far inside the panel's edges.
const inspectorRowPadding = 8;

/*
 * The Inspector's toggle keeps one place, open or closed: the open Inspector's top row spans the panel with its
 * buttons at its start and the toggle at its end, and the closed Inspector's capsule closes round the same buttons
 * with the toggle where it stands. The row's padding never changes, so no button jumps as the group's width moves.
 */
function trailingStyle(parts: TrailingReads): ViewStyle {
  const { inspector } = parts.layout;
  const padding = { paddingLeft: inspectorRowPadding, paddingRight: inspectorRowPadding };

  if (inspector.open) return { ...padding, width: inspector.width };

  return hasControls(parts) ? padding : { paddingLeft: 0, paddingRight: 0 };
}

// The capsule's pill runs 2 outside its buttons, inside the row's padding.
const capsuleInset = inspectorRowPadding - capsulePadding;

type BandTrailingProps = ScaffoldPartProps & { refs: BandRefs };

/*
 * The page's buttons and the Session's panel controls float in a capsule at the title bar's end while the Inspector is
 * closed, mirroring the sidebar's, and sit in the open Inspector's top row, which the group spans while the title bar
 * above it lets presses through to the Inspector.
 */
export function BandTrailing({
  refs,
  ...parts
}: BandTrailingProps): ReactElement {
  const controls = hasControls(parts);

  return (
    <View
      ref={refs.trailing}
      testID={controls ? 'window-band-trailing' : undefined}
      pointerEvents="box-none"
      className="min-w-0 shrink flex-row items-center justify-between gap-1"
      style={trailingStyle(parts)}
    >
      <BandCapsule
        shown={trailingCapsuleShown(parts)}
        motionRef={refs.trailingCapsule}
        style={{ left: capsuleInset, right: capsuleInset }}
      />
      {controls ? <TrailingControls {...parts} /> : null}
    </View>
  );
}

function TrailingControls(parts: ScaffoldPartProps): ReactElement {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <PanelControls {...parts} />
      </View>
      {parts.scaffold.band?.session ? (
        <IconButton {...inspectorToggleProps(parts)} />
      ) : null}
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
