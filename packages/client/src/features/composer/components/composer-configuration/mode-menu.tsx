import {
  configurationChoices,
  type SessionConfigSelectOption,
} from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import {
  Menu,
  type MenuAction,
  type MenuEntry,
} from '@repo/kit/primitives/overlays/menu';
import type * as React from 'react';
import { View } from 'react-native';
import type { ComposerConfigurationProps } from './configuration-types';
import { isDangerous, selection } from './configuration-values';
import type { Mode } from './mode-types';

interface ModeMenuProps {
  configuration: ComposerConfigurationProps;
  mode: Mode;
  trigger: React.ReactElement;
}

// The desktop Composer pill opens menu rows: arrows navigate, while Enter or a pointer chooses.
export function ModeMenu(props: ModeMenuProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Mode"
      align="start"
      trigger={props.trigger}
      actions={modeActions(props)}
    />
  );
}

function modeActions(props: ModeMenuProps): MenuEntry[] {
  const modes = modeChoiceActions(props);
  const collaboration = selection(props.configuration, 'collaboration_mode');

  return collaboration
    ? [...modes, collaborationAction(props.configuration, collaboration)]
    : modes;
}

function modeChoiceActions(props: ModeMenuProps): MenuAction[] {
  return configurationChoices(props.mode).map((choice): MenuAction => ({
    label: choice.name,
    selected: choice.value === props.mode.currentValue,
    tone: isDangerous(choice) ? 'danger' : undefined,
    content: <ModeActionContent choice={choice} />,
    onPress: () =>
      props.configuration.onConfigChange(props.mode.configId, choice.value),
  }));
}

function collaborationAction(
  configuration: ComposerConfigurationProps,
  collaboration: Mode,
): MenuEntry {
  const current = configurationChoices(collaboration).find(
    (choice) => choice.value === collaboration.currentValue,
  );

  return {
    label: collaboration.name,
    accessibilityLabel: `${collaboration.name}, ${current?.name ?? collaboration.currentValue}`,
    section: {},
    actions: collaborationChoices(configuration, collaboration),
  };
}

function collaborationChoices(
  configuration: ComposerConfigurationProps,
  collaboration: Mode,
): MenuAction[] {
  return configurationChoices(collaboration).map((choice): MenuAction => ({
    label: choice.name,
    selected: choice.value === collaboration.currentValue,
    onPress: () =>
      configuration.onConfigChange(collaboration.configId, choice.value),
  }));
}

function ModeActionContent({
  choice,
}: {
  choice: SessionConfigSelectOption;
}): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text>{choice.name}</Text>
      {choice.description ? (
        <Text tone="muted">{choice.description}</Text>
      ) : null}
    </View>
  );
}
