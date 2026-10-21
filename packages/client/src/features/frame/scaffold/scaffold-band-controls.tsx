import type { ReactElement } from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/actions/icon-button';
import { bandControlAppearance } from './band-control-appearance';
import type { ScaffoldPartProps } from './use-scaffold-layout';

function WorkbenchToggle({
  scaffold,
  layout,
}: ScaffoldPartProps): ReactElement {
  const visible =
    layout.frame.workbenchDocked || scaffold.workbenchShown === true;

  return (
    <IconButton
      {...bandControlAppearance}
      icon="workbench"
      selected={visible}
      accessibilityLabel="Toggle Workbench"
      disabled={!scaffold.band?.workbench}
      onPress={() => scaffold.onWorkbenchShownChange?.(!visible)}
    />
  );
}

function StageExpand({ scaffold, layout }: ScaffoldPartProps): ReactElement {
  const expanded = layout.inspectorExpanded;
  const label = expanded ? 'Restore Stage' : 'Expand Stage';

  return (
    <IconButton
      {...bandControlAppearance}
      icon={expanded ? 'collapse' : 'expand'}
      selected={expanded}
      accessibilityLabel={label}
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
      {...bandControlAppearance}
      icon="stage"
      selected={open}
      accessibilityLabel={label}
      onPress={() => toggleStage(scaffold, open)}
    />
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

export function BandTrailing(parts: ScaffoldPartProps): ReactElement {
  return (
    <View
      testID="window-band-trailing"
      className="shrink-0 flex-row items-center gap-1 web:[app-region:no-drag]"
    >
      <View className="size-7 shrink-0">
        {parts.scaffold.band?.menu ?? (
          <IconButton
            {...bandControlAppearance}
            icon="more"
            accessibilityLabel="More"
            disabled
          />
        )}
      </View>
      <WorkbenchToggle {...parts} />
      <StageExpand {...parts} />
      <StageToggle {...parts} />
    </View>
  );
}
