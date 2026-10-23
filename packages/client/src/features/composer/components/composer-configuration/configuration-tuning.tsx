import type { SessionConfigOption } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';

interface TuningProps {
  configuration: ComposerConfigurationProps;
}

type EffortProps = TuningProps & { effort: ReturnType<typeof currentEffort> };

type BooleanOption = Extract<SessionConfigOption, { type: 'boolean' }>;

interface SwitchProps extends TuningProps {
  option: BooleanOption;
}

/*
 * Effort and the switches are calls, as a Section reads its rows by element type.
 * Effort steps through the model's levels: the slider's value is the level's place in the list.
 */
export function effortControl(props: TuningProps): React.JSX.Element | null {
  const effort = currentEffort(props.configuration);

  if (!effort.option || !effort.selected) return null;

  return (
    <FieldGroup.Slider
      key="effort"
      {...effortSliderProps({ ...props, effort })}
    />
  );
}

function effortSliderProps({
  configuration,
  effort,
}: EffortProps): React.ComponentProps<typeof FieldGroup.Slider> {
  return {
    title: 'Effort',
    min: 0,
    max: Math.max(1, effort.choices.length - 1),
    step: 1,
    value: effort.selected ? effort.choices.indexOf(effort.selected) : 0,
    onValueChange: (index) => selectEffort({ configuration, effort }, index),
  };
}

function selectEffort(
  { configuration, effort }: EffortProps,
  index: number,
): void {
  const choice = effort.choices[Math.round(index)];

  if (choice && effort.option)
    configuration.onConfigChange(effort.option.configId, choice.value);
}

// A call, so the section places each switch row.
export function switchOptions(props: TuningProps): React.JSX.Element[] {
  return switches(props.configuration).map((option) =>
    configurationSwitch({ ...props, option }),
  );
}

function configurationSwitch(props: SwitchProps): React.JSX.Element {
  const { configuration, option } = props;

  return (
    <FieldGroup.Toggle
      key={option.configId}
      title={option.name}
      value={option.currentValue}
      onValueChange={(checked) =>
        configuration.onConfigChange(option.configId, checked)
      }
    />
  );
}
