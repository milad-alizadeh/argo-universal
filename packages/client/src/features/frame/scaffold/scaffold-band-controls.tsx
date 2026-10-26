import {
  IconButton,
  type IconButtonProps,
} from '@repo/kit/primitives/actions/icon-button';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  bandControlAppearance,
  bandToggleAppearance,
} from './band-control-appearance';
import type { ScaffoldPartProps } from './use-scaffold-layout';

function workbenchProps({
  scaffold,
  layout,
}: ScaffoldPartProps): IconButtonProps {
  const visible = ['docked', 'floating'].includes(layout.frame.workbenchState);

  return {
    ...bandToggleAppearance(visible),
    icon: 'workbench',
    accessibilityLabel: 'Toggle Workbench',
    disabled: !scaffold.band?.workbench,
    onPress: () => scaffold.onWorkbenchShownChange?.(!visible),
  };
}

function WorkbenchToggle(parts: ScaffoldPartProps): ReactElement {
  return <IconButton {...workbenchProps(parts)} />;
}

function expandProps({ scaffold, layout }: ScaffoldPartProps): IconButtonProps {
  const expanded = layout.inspectorExpanded;

  return {
    ...bandToggleAppearance(expanded),
    icon: expanded ? 'collapse' : 'expand',
    accessibilityLabel: expanded ? 'Restore Inspector' : 'Expand Inspector',
    disabled: !layout.inspectorOpen,
    onPress: () =>
      scaffold.onInspectorStateChange(expanded ? 'open' : 'expanded'),
  };
}

function ExpandInspector(parts: ScaffoldPartProps): ReactElement {
  return <IconButton {...expandProps(parts)} />;
}

function inspectorToggleProps({
  scaffold,
  layout,
}: ScaffoldPartProps): IconButtonProps {
  const open = layout.inspectorOpen;

  return {
    ...bandToggleAppearance(open),
    icon: 'stage',
    accessibilityLabel: open ? 'Hide Inspector' : 'Show Inspector',
    disabled: !open && !inspectorOffered(scaffold),
    onPress: () => toggleInspector(scaffold, open),
  };
}

function InspectorToggle(parts: ScaffoldPartProps): ReactElement {
  return <IconButton {...inspectorToggleProps(parts)} />;
}

function inspectorOffered(scaffold: ScaffoldPartProps['scaffold']): boolean {
  return (
    scaffold.inspectorAvailable !== false || !!scaffold.band?.onInspectorToggle
  );
}

function toggleInspector(
  scaffold: ScaffoldPartProps['scaffold'],
  open: boolean,
): void {
  if (open) scaffold.onInspectorStateChange('closed');
  else openInspector(scaffold);
}

function openInspector(scaffold: ScaffoldPartProps['scaffold']): void {
  if (scaffold.band?.onInspectorToggle) scaffold.band.onInspectorToggle();
  else scaffold.onInspectorStateChange('open');
}

function BandMenu({ scaffold }: ScaffoldPartProps): ReactElement {
  return (
    <View className="shrink-0 flex-row items-center gap-1">
      {scaffold.band?.menu ?? (
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
      <BandMenu {...parts} />
      <WorkbenchToggle {...parts} />
      <ExpandInspector {...parts} />
      <InspectorToggle {...parts} />
    </View>
  );
}
