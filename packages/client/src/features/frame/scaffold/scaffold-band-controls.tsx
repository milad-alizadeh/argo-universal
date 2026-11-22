import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { WindowBandSession } from '#lib/product/window-band';
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

function SessionControls(
  parts: ScaffoldPartProps & SessionReads,
): ReactElement {
  return (
    <>
      <IconButton {...workbenchProps(parts)} />
      <IconButton {...expandProps(parts)} />
      <IconButton {...inspectorToggleProps(parts)} />
    </>
  );
}

// Window controls follow the Session that owns the Workbench and Inspector.
export function BandTrailing(parts: ScaffoldPartProps): ReactElement | null {
  const session = parts.scaffold.band?.session;

  if (!session) return null;

  return (
    <View
      testID="window-band-trailing"
      className="shrink-0 flex-row items-center gap-1"
    >
      <SessionControls {...parts} session={session} />
    </View>
  );
}
