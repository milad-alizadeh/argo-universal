import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import { workbenchDrawn } from './frame-layout';
import { inspectorOffered, moveInspector } from './inspector-column';
import type { PartReads, ScaffoldPartProps } from './use-scaffold-layout';

type WorkbenchReads = PartReads<
  'band' | 'onWorkbenchIntentChange',
  'workbench'
>;

type ExpandReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band',
  'inspector'
>;

type InspectorToggleReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band' | 'inspectorAvailable',
  'inspector'
>;

function workbenchProps({ scaffold, layout }: WorkbenchReads): IconButtonProps {
  const visible = workbenchDrawn(layout.workbench.state);

  return {
    ...bandToggleAppearance(visible),
    icon: 'workbench',
    accessibilityLabel: 'Toggle Workbench',
    disabled: !scaffold.band?.workbench,
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

function BandMenu({ menu }: { menu: ReactNode }): ReactElement {
  return (
    <View className="shrink-0 flex-row items-center gap-1">
      {menu ?? (
        <IconButton
          {...bandControlAppearance}
          icon="more"
          accessibilityLabel="More"
          disabled
        />
      )}
    </View>
  );
}

export function BandTrailing(parts: ScaffoldPartProps): ReactElement {
  return (
    <View
      testID="window-band-trailing"
      className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]"
    >
      <BandMenu menu={parts.scaffold.band?.menu} />
      <IconButton {...workbenchProps(parts)} />
      <IconButton {...expandProps(parts)} />
      <IconButton {...inspectorToggleProps(parts)} />
    </View>
  );
}
