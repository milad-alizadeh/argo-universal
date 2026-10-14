import type { SessionConfigSelectOption } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { configurationChoices } from '#lib/product/session-configuration';
import { Icon } from '#primitives/display/icon/icon';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { ConfigurationChoice } from './configuration-choice';
import { configurationIcon, choiceMetadata } from './configuration-values';
import { isDangerous } from './configuration-values';
import type { ModeContentsProps } from './mode-types';

interface ModeChoiceProps extends ModeContentsProps {
  choice: SessionConfigSelectOption;
}

const destructiveTextClassName = 'text-destructive';

export function ModeContents(props: ModeContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 wide:p-3 bg-sidebar">
      <FieldGroup fit>
        <FieldSection>
          {configurationChoices(props.mode).map((choice) => (
            <ModeChoice key={choice.value} {...props} choice={choice} />
          ))}
        </FieldSection>
      </FieldGroup>
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
    name: configurationIcon(choiceMetadata(choice)?.icon),
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
