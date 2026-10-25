import type { SessionConfigSelectOption } from '@repo/contracts';
import { configurationChoices } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ComponentProps, ReactElement } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { isDangerous, type SelectConfiguration } from './configuration-values';

type PickerProps = ComponentProps<typeof FieldGroup.Picker>;

interface Props {
  configuration: ComposerConfigurationProps;
  option: SelectConfiguration;
  title: string;
  leading?: PickerProps['leading'];
  choiceLabel?: (choice: SessionConfigSelectOption) => string;
}

// The choices of a select option as picker options, each named by `label` when it has one.
export function choiceOptions(
  option: SelectConfiguration,
  label?: (choice: SessionConfigSelectOption) => string,
): PickerProps['options'] {
  return configurationChoices(option).map((choice) =>
    choiceOption(choice, label?.(choice)),
  );
}

const choiceOption = (
  choice: SessionConfigSelectOption,
  label: string | undefined,
): PickerProps['options'][number] => ({
  value: choice.value,
  label: label ?? choice.name,
  subtitle: choice.description,
  tone: choiceTone(choice),
});

// A choice the Agent marks dangerous, such as Full access, is drawn in the destructive tone.
const choiceTone = (choice: SessionConfigSelectOption): 'danger' | undefined =>
  isDangerous(choice) ? 'danger' : undefined;

/*
 * A Configure row for one select option: its choices open on a page of their own, beside the menu on a desktop
 * and pushed on the Sheet's stack on a phone. Configure's lists are short, so none searches.
 */
export function configurationPicker(props: Props): ReactElement {
  return (
    <FieldGroup.Picker
      key={props.option.configId}
      title={props.title}
      leading={props.leading}
      presentation="page"
      value={props.option.currentValue}
      options={choiceOptions(props.option, props.choiceLabel)}
      onValueChange={(value) => commit(props, value)}
    />
  );
}

const commit = (props: Props, value: string): void =>
  props.configuration.onConfigChange(props.option.configId, value);
