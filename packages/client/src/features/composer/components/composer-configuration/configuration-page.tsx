import type * as React from 'react';
import { View } from 'react-native';
import { IconButton } from '#primitives/buttons/icon-button';
import { Text } from '#primitives/display/text';
import { AgentChoices } from './agent-choices';
import type { ComposerConfigurationProps } from './configuration-types';
import { ModelChoices } from './model-choices';

interface PickerProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
  close: () => void;
}

export function ConfigurationPage(props: PickerProps): React.JSX.Element {
  return (
    <View className="min-h-80">
      <ConfigurationPageHeader {...props} />
      <ConfigurationPageChoices {...props} />
    </View>
  );
}

function ConfigurationPageHeader(props: PickerProps): React.JSX.Element {
  return (
    <View className="h-11 px-4 flex-row items-center">
      <ConfigurationBackButton close={props.close} />
      <Text role="control" className="flex-1 text-center">
        {props.page === 'agent' ? 'Select Agent' : 'Select Model'}
      </Text>
      <View className="size-11" />
    </View>
  );
}

function ConfigurationBackButton({
  close,
}: Pick<PickerProps, 'close'>): React.JSX.Element {
  return (
    <IconButton
      variant="ghost"
      accessibilityLabel="Back to Configure"
      onPress={close}
      icon="chevron-left"
    />
  );
}

function ConfigurationPageChoices({
  configuration,
  page,
  close,
}: PickerProps): React.JSX.Element {
  return page === 'agent' ? (
    <AgentChoices configuration={configuration} onSelect={close} />
  ) : (
    <ModelChoices configuration={configuration} onSelect={close} />
  );
}
