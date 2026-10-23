import type { SessionConfigOption } from '@repo/contracts';
import { Slider } from '@repo/kit/primitives/controls/slider';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type * as React from 'react';
import { SwitchListItem } from '#lib/product/switch-list-item/switch-list-item';
import { ConfigurationRowIcon, optionIcon } from './configuration-row-icon';
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

export function EffortControl(props: TuningProps): React.JSX.Element | null {
  const effort = currentEffort(props.configuration);

  if (!effort.option || !effort.selected) return null;

  return (
    <ListItem
      title="Effort"
      leading={<ConfigurationRowIcon name="thinking" />}
      value={effort.selected.name}
      control={<EffortSlider {...props} effort={effort} />}
    />
  );
}

function EffortSlider(props: EffortProps): React.JSX.Element {
  return <Slider {...effortSliderProps(props)} />;
}

function effortSliderProps({
  configuration,
  effort,
}: EffortProps): React.ComponentProps<typeof Slider> {
  return {
    accessibilityLabel: 'Effort',
    valueLabel: selectedEffortLabel(effort),
    minimumValue: 0,
    maximumValue: Math.max(1, effort.choices.length - 1),
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

// A call, so the list places each switch row.
export function switchOptions(props: TuningProps): React.JSX.Element[] {
  return switches(props.configuration).map((option) => (
    <ConfigurationSwitch key={option.configId} {...props} option={option} />
  ));
}

function ConfigurationSwitch(props: SwitchProps): React.JSX.Element {
  const { configuration, option } = props;

  return (
    <SwitchListItem
      title={option.name}
      leading={optionIcon(option)}
      value={option.currentValue}
      onValueChange={(checked) =>
        configuration.onConfigChange(option.configId, checked)
      }
    />
  );
}

function selectedEffortLabel(effort: ReturnType<typeof currentEffort>): string {
  return effort.selected?.name ?? '';
}
