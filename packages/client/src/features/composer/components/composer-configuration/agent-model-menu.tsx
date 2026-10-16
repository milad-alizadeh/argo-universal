import type * as React from 'react';
import { Platform, View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ConfigurationDrill } from './configuration-drill';
import { EffortControl, SwitchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

interface ContentsProps extends MenuProps {
  wide: boolean;
}

// Configure's settings: on a desktop the Agent and Model rows open popovers beside the menu; elsewhere they push the sheet's pages.
export function AgentModelMenu(props: MenuProps): React.JSX.Element {
  return <ConfigurationContents {...props} wide={isDesktopMenu(useWide())} />;
}

export function isDesktopMenu(wide: boolean): boolean {
  return wide && Platform.OS === 'web';
}

function ConfigurationContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 bg-content web:wide:bg-card">
      <ConfigurationFields {...props} />
    </View>
  );
}

function ConfigurationFields(props: ContentsProps): React.JSX.Element {
  return (
    <GroupedList fit={Platform.OS === 'web' || props.wide}>
      <ConfigurationDrills {...props} />
      <ConfigurationTuning configuration={props.configuration} />
    </GroupedList>
  );
}

function hasTuning(configuration: ComposerConfigurationProps): boolean {
  return (
    switches(configuration).length > 0 ||
    !!currentEffort(configuration).selected
  );
}

function configurationNotice(
  configuration: ComposerConfigurationProps,
): string | undefined {
  return configuration.turnRunning
    ? 'A Turn is running. Changes apply from the next Turn.'
    : undefined;
}

function ConfigurationDrills(props: ContentsProps): React.JSX.Element {
  const notice = hasTuning(props.configuration)
    ? undefined
    : configurationNotice(props.configuration);

  return (
    <PopoverHoverGroup>
      <GroupedListSection footer={notice}>
        <ConfigurationDrillRows {...props} />
      </GroupedListSection>
    </PopoverHoverGroup>
  );
}

function ConfigurationDrillRows(props: ContentsProps): React.JSX.Element {
  const drillProps = { configuration: props.configuration, wide: props.wide };

  return (
    <>
      <ConfigurationDrill {...drillProps} page="agent" />
      <ConfigurationDrill {...drillProps} page="model" />
    </>
  );
}

function ConfigurationTuning({
  configuration,
}: Pick<MenuProps, 'configuration'>): React.JSX.Element | null {
  if (!hasTuning(configuration)) return null;

  return (
    <GroupedListSection footer={configurationNotice(configuration)}>
      <SwitchOptions configuration={configuration} />
      <EffortControl configuration={configuration} />
    </GroupedListSection>
  );
}
