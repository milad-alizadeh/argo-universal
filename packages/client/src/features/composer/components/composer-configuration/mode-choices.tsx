import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { configurationChoices } from '#lib/product/session-configuration';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ConfigurationChoice } from './configuration-choice';
import { ConfigurationCombobox } from './configuration-combobox';
import { ConfigurationRowIcon } from './configuration-row-icon';
import { selection } from './configuration-values';
import { isDangerous } from './configuration-values';
import { modeIcon } from './mode-icon';
import type { ModeContentsProps } from './mode-types';

interface ModeChoiceProps extends ModeContentsProps {
  choice: SessionConfigSelectOption;
}

const destructiveTextClassName = 'text-danger';

export function ModeContents(props: ModeContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 native:wide:p-3 bg-content web:wide:bg-card">
      <List appearance="grouped" fit>
        <ListSection selectionMode="single">
          {configurationChoices(props.mode).map((choice) => (
            <ModeChoice key={choice.value} {...props} choice={choice} />
          ))}
        </ListSection>
        {collaborationSection(props)}
      </List>
    </View>
  );
}

function ModeChoice(props: ModeChoiceProps): React.JSX.Element {
  return (
    <ConfigurationChoice
      {...modeChoiceProps(props)}
      leading={<ModeChoiceIcon choice={props.choice} />}
    />
  );
}

function modeChoiceProps({
  configuration,
  mode,
  close,
  choice,
}: ModeChoiceProps): React.ComponentProps<typeof ConfigurationChoice> {
  return {
    selected: choice.value === mode.currentValue,
    label: choice.name,
    description: choice.description,
    dangerous: isDangerous(choice),
    onPress: () => selectMode({ configuration, mode, close, choice }),
  };
}

function ModeChoiceIcon(
  props: Pick<ModeChoiceProps, 'choice'>,
): React.JSX.Element {
  return <Icon {...modeChoiceIconProps(props.choice)} />;
}

function modeChoiceIconProps(
  choice: SessionConfigSelectOption,
): React.ComponentProps<typeof Icon> {
  return {
    role: 'control',
    name: modeIcon(choice),
    className: cn(
      'text-foreground',
      isDangerous(choice) && destructiveTextClassName,
    ),
  };
}

function selectMode({
  configuration,
  mode,
  close,
  choice,
}: ModeChoiceProps): void {
  configuration.onConfigChange(mode.configId, choice.value);
  close();
}

function collaborationSection(
  props: ModeContentsProps,
): React.JSX.Element | null {
  const option = selection(props.configuration, 'collaboration_mode');

  if (!option) return null;

  return <ListSection>{collaborationRow(props, option)}</ListSection>;
}

function collaborationRow(
  props: ModeContentsProps,
  option: NonNullable<ReturnType<typeof selection>>,
): React.JSX.Element {
  return (
    <ConfigurationCombobox
      configuration={props.configuration}
      option={option}
      label={option.name}
      title={option.name}
      leading={<ConfigurationRowIcon name="plan-mode" />}
    />
  );
}
