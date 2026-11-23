import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { WindowBandSession } from '#lib/product/window-band';
import { BandCapsule } from './band-capsule';
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

const hasControls = ({ scaffold }: ScaffoldPartProps): boolean =>
  Boolean(scaffold.band?.session ?? scaffold.band?.actions);

// The page's buttons and the Session's panel controls float in a capsule at the title bar's end while the Inspector is closed, mirroring the sidebar's.
export function BandTrailing(parts: ScaffoldPartProps): ReactElement | null {
  if (!hasControls(parts) || parts.layout.inspector.open) return null;

  return (
    <View testID="window-band-trailing" className="shrink-0">
      <BandCapsule>
        <PanelControls {...parts} />
        {parts.scaffold.band?.session ? (
          <IconButton {...inspectorToggleProps(parts)} />
        ) : null}
      </BandCapsule>
    </View>
  );
}

/*
 * The open Inspector's top row, on the title bar's line: the capsule's buttons at its start, and its own toggle,
 * selected, at its end, as the open sidebar holds its toggle. A page that owns no Session leaves the row empty.
 */
export function InspectorTitleBar(parts: ScaffoldPartProps): ReactElement {
  return (
    <View
      testID="inspector-title-bar"
      className="shrink-0 flex-row items-center justify-between px-2"
      style={{ height: parts.layout.measures.titleBarHeight }}
    >
      {hasControls(parts) ? <InspectorRowControls {...parts} /> : null}
    </View>
  );
}

function InspectorRowControls(parts: ScaffoldPartProps): ReactElement {
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
