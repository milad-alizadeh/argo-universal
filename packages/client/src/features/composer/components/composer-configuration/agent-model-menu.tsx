import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text';
import { Picker } from '#primitives/inputs/picker';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { agentOptions, modelOptions } from './agent-model-options';
import { EffortControl, SwitchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  selectedChoice,
  selection,
  switches,
} from './configuration-values';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

// Configure: the Agent and model as drill rows, then the Agent's switches and effort.
export function AgentModelMenu(props: MenuProps): React.JSX.Element {
  const wide = useWide();

  return (
    <View className="native:flex-1 wide:p-3 bg-content">
      <GroupedList fit={Platform.OS === 'web' || wide}>
        <MenuHeading wide={wide} />
        <AgentModelRows {...props} />
        <ConfigurationTuning configuration={props.configuration} />
      </GroupedList>
    </View>
  );
}

// A desktop popover names itself; a sheet's title does on a phone.
function MenuHeading(props: { wide: boolean }): React.JSX.Element | null {
  if (!props.wide || Platform.OS !== 'web') return null;

  return (
    <Text role="heading" aria-level={2} className="px-4 pt-1">
      Configure
    </Text>
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

function AgentModelRows({ configuration }: MenuProps): React.JSX.Element {
  const notice = hasTuning(configuration)
    ? undefined
    : configurationNotice(configuration);

  return (
    <PopoverHoverGroup>
      <GroupedListSection footer={notice}>
        <AgentPicker configuration={configuration} />
        <ModelPicker configuration={configuration} />
      </GroupedListSection>
    </PopoverHoverGroup>
  );
}

function AgentPicker({ configuration }: MenuProps): React.JSX.Element {
  return (
    <Picker
      variant="row"
      label="Agent"
      value={configuration.agent}
      options={agentOptions(configuration)}
      onValueChange={(agent) => {
        if (agent !== configuration.agent) configuration.onAgentChange?.(agent);
      }}
    />
  );
}

function ModelPicker({ configuration }: MenuProps): React.JSX.Element | null {
  const model = selection(configuration, 'model');

  if (!model) return null;

  return (
    <Picker
      variant="row"
      label="Model"
      value={selectedChoice(configuration, 'model')?.value}
      options={modelOptions(configuration)}
      onValueChange={(value) =>
        configuration.onConfigChange(model.configId, value)
      }
    />
  );
}

function ConfigurationTuning({
  configuration,
}: MenuProps): React.JSX.Element | null {
  if (!hasTuning(configuration)) return null;

  return (
    <GroupedListSection footer={configurationNotice(configuration)}>
      <SwitchOptions configuration={configuration} />
      <EffortControl configuration={configuration} />
    </GroupedListSection>
  );
}
