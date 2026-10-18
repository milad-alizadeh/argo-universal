import type { SessionConfigOption } from '@repo/contracts';
import type * as React from 'react';
import { configurationChoices } from '#lib/product/session-configuration';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type { ComposerConfigurationProps } from '../composer-configuration/composer-configuration';

type Option = SessionConfigOption;

type Change = ComposerConfigurationProps['onConfigChange'];

export function settingSection(
  option: Option,
  onChange: Change,
): React.JSX.Element {
  if (option.type === 'boolean') return booleanSection(option, onChange);

  return selectSection(option, onChange);
}

function booleanSection(
  option: Extract<Option, { type: 'boolean' }>,
  onChange: Change,
): React.JSX.Element {
  return (
    <List.Section key={option.configId}>
      <ListItem.Toggle
        title={option.name}
        value={option.currentValue}
        onValueChange={(value) => onChange(option.configId, value)}
      />
    </List.Section>
  );
}

function selectSection(
  option: Extract<Option, { type: 'select' }>,
  onChange: Change,
): React.JSX.Element {
  return (
    <List.Section
      key={option.configId}
      title={option.name}
      selectionMode="single"
    >
      {choiceRows(option, onChange)}
    </List.Section>
  );
}

function choiceRows(
  option: Extract<Option, { type: 'select' }>,
  onChange: Change,
): React.JSX.Element[] {
  return configurationChoices(option).map((choice) => (
    <ListItem key={choice.value} {...choiceProps(option, choice, onChange)} />
  ));
}

function choiceProps(
  option: Extract<Option, { type: 'select' }>,
  choice: ReturnType<typeof configurationChoices>[number],
  onChange: Change,
): React.ComponentProps<typeof ListItem> {
  return {
    title: choice.name,
    accessibilityLabel: `${option.name}: ${choice.name}`,
    selected: option.currentValue === choice.value,
    onPress: () => onChange(option.configId, choice.value),
  };
}
