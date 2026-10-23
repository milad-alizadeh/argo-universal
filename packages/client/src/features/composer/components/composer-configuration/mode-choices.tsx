import type { SessionConfigSelectOption } from '@repo/contracts';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import type * as React from 'react';
import { View } from 'react-native';
import { configurationChoices } from '#lib/product/session-configuration';
import { ConfigurationChoice } from './configuration-choice';
import { ConfigurationCombobox } from './configuration-combobox';
import { selection } from './configuration-values';
import { isDangerous } from './configuration-values';
import type { ModeContentsProps } from './mode-types';

interface ModeChoiceProps extends ModeContentsProps {
  choice: SessionConfigSelectOption;
}

export function ModeContents(props: ModeContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 native:wide:p-3 bg-content web:wide:bg-card">
      <List appearance="plain" fit>
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

/*
 * A mode is the Agent's own word, not Argo's: ACP sends it as a value, a name and a description and nothing
 * else. Any glyph beside it would be Argo guessing at one Agent's vocabulary, so the row is its name, its
 * description and its check (owner, 2026-10-20).
 */
function ModeChoice(props: ModeChoiceProps): React.JSX.Element {
  return <ConfigurationChoice {...modeChoiceProps(props)} />;
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
    />
  );
}
