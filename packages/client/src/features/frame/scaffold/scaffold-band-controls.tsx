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

function StageExpand({ scaffold, layout }: ScaffoldPartProps): ReactElement {
  const expanded = layout.inspectorExpanded;

  return (
    <IconButton
      {...bandToggleAppearance(expanded)}
      icon={expanded ? 'collapse' : 'expand'}
      accessibilityLabel={expanded ? 'Restore Stage' : 'Expand Stage'}
      disabled={!layout.inspectorOpen}
      onPress={() =>
        scaffold.onInspectorStateChange(expanded ? 'open' : 'expanded')
      }
    />
  );
}

function StageToggle({ scaffold, layout }: ScaffoldPartProps): ReactElement {
  const open = layout.inspectorOpen;
  const label = open ? 'Hide Stage' : 'Show Stage';

  return (
    <IconButton
      {...bandToggleAppearance(open)}
      icon="stage"
      accessibilityLabel={label}
      disabled={!open && !stageAvailable(scaffold)}
      onPress={() => toggleStage(scaffold, open)}
    />
  );
}

function stageAvailable(scaffold: ScaffoldPartProps['scaffold']): boolean {
  return (
    scaffold.inspectorAvailable !== false || !!scaffold.band?.onStageToggle
  );
}

function toggleStage(
  scaffold: ScaffoldPartProps['scaffold'],
  open: boolean,
): void {
  if (open) scaffold.onInspectorStateChange('closed');
  else openStage(scaffold);
}

function openStage(scaffold: ScaffoldPartProps['scaffold']): void {
  if (scaffold.band?.onStageToggle) scaffold.band.onStageToggle();
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
      <StageExpand {...parts} />
      <StageToggle {...parts} />
    </View>
  );
}
