import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type {
  WindowBandSession,
  WindowBandView,
} from '#lib/product/window-band';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { workbenchDrawn } from './frame-layout';
import { inspectorOffered, moveInspector } from './inspector-column';
import type { PartReads, ScaffoldPartProps } from './use-scaffold-layout';

// A control over the Session reads the Session the page claimed beside the layout its pane is in.
type SessionReads = { session: WindowBandSession };

type WorkbenchReads = PartReads<'onWorkbenchIntentChange', 'workbench'> &
  SessionReads;

type ExpandReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band',
  'inspector'
>;

type InspectorToggleReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band' | 'inspectorAvailable',
  'inspector'
>;

function workbenchProps({
  scaffold,
  layout,
  session,
}: WorkbenchReads): IconButtonProps {
  const visible = workbenchDrawn(layout.workbench.state);

  return {
    ...bandToggleAppearance(visible),
    icon: 'workbench',
    accessibilityLabel: 'Toggle Workbench',
    disabled: !session.workbench,
    onPress: () =>
      scaffold.onWorkbenchIntentChange(visible ? 'hidden' : 'shown'),
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

function inspectorToggleProps({
  scaffold,
  layout,
}: InspectorToggleReads): IconButtonProps {
  const open = layout.inspector.open;

  return {
    ...bandToggleAppearance(open),
    icon: 'stage',
    accessibilityLabel: open ? 'Hide Inspector' : 'Show Inspector',
    disabled: !open && !inspectorOffered(scaffold),
    onPress: () => moveInspector(scaffold, 'toggle'),
  };
}

// A Session that declares no Action still holds the slot, so the group never reflows as the Session's own state changes.
const sessionMenu = (menu: ReactNode): ReactNode =>
  menu ?? (
    <IconButton
      {...bandControlAppearance}
      icon="more"
      accessibilityLabel="More"
      disabled
    />
  );

function SessionControls(
  parts: ScaffoldPartProps & SessionReads & { menu: ReactNode },
): ReactElement {
  return (
    <>
      {sessionMenu(parts.menu)}
      <IconButton {...workbenchProps(parts)} />
      <IconButton {...expandProps(parts)} />
      <IconButton {...inspectorToggleProps(parts)} />
    </>
  );
}

function trailingContent(
  band: WindowBandView,
  parts: ScaffoldPartProps,
): ReactNode {
  return band.session ? (
    <SessionControls {...parts} session={band.session} menu={band.menu} />
  ) : (
    band.menu
  );
}

function TrailingGroup({
  band,
  ...parts
}: ScaffoldPartProps & { band: WindowBandView }): ReactElement {
  return (
    <View
      testID="window-band-trailing"
      className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]"
    >
      {trailingContent(band, parts)}
    </View>
  );
}

const trailingDrawn = (band: WindowBandView): boolean =>
  Boolean(band.menu || band.session);

/*
 * The band's trailing group is what the focused page contributes, never a list of screens the band knows: a Session's
 * controls over its Workbench and its Inspector, or, from a page that owns no Session, that page's own Screen
 * Actions. A page that contributes neither has no group, and the band's leading group and title keep their places.
 */
export function BandTrailing(parts: ScaffoldPartProps): ReactElement | null {
  const band = parts.scaffold.band;

  return band && trailingDrawn(band) ? (
    <TrailingGroup {...parts} band={band} />
  ) : null;
}
