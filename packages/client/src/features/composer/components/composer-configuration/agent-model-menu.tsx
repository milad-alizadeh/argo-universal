import type * as React from 'react';
import { Platform, View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { PopoverHoverGroup, PopoverTitle } from '#primitives/overlays/popover';
import { AgentDrill } from './agent-drill';
import { EffortControl, SwitchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';
import { ModelPicker } from './model-picker';

// Paper: the desktop popover's title and the phone sheet's page title.
export const configureTitle = 'Configure';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

interface ContentsProps extends MenuProps {
  // The desktop popover's menu, rather than a sheet's page.
  wide: boolean;
}

// Configure's settings: on a desktop the Agent and Model rows open popovers beside the menu; elsewhere they push the sheet's pages.
export function AgentModelMenu(props: ContentsProps): React.JSX.Element {
  return <ConfigurationContents {...props} />;
}

function ConfigurationContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 bg-content web:wide:bg-card">
      {props.wide ? <PopoverTitle>{configureTitle}</PopoverTitle> : null}
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
  return (
    <>
      <AgentDrill configuration={props.configuration} wide={props.wide} />
      <ModelPicker configuration={props.configuration} />
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
