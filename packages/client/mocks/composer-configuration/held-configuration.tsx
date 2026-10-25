import { settleViewport } from '@repo/kit/settle-viewport';
import { recordedSessionOptions } from '@repo/mocks/app';
import type * as React from 'react';
import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ComposerAgentModelControl } from '../../src/features/composer/components/composer-configuration/composer-configuration';
import { configure, type Configure } from '../composer/configure.test.mocks';
import { updateComposerSettings } from '../composer-mock';
import {
  heldNotice,
  type Story,
  type Configuration,
  type PlayContext,
} from './common';
import { assertHeldFallback, type HeldScenario } from './held-assertions';
import { heldChoiceCases } from './held-cases';

interface HeldProps {
  configuration: Configuration;
}

function HeldConfiguration({ configuration }: HeldProps): React.JSX.Element {
  const liveConfiguration = useHeldConfiguration(configuration);

  return (
    <View className="p-4">
      <ComposerAgentModelControl
        disabled={false}
        configuration={liveConfiguration}
      />
    </View>
  );
}

function useHeldConfiguration(configuration: Configuration): Configuration {
  const [configOptions, setConfigOptions] = useState(
    recordedSessionOptions(configuration.agent?.id ?? ''),
  );

  return {
    ...configuration,
    configOptions,
    onConfigChange: heldConfigurationChanged(configuration, setConfigOptions),
  };
}

type SetConfigOptions = Dispatch<
  SetStateAction<Configuration['configOptions']>
>;

function heldConfigurationChanged(
  configuration: Configuration,
  setConfigOptions: SetConfigOptions,
): Configuration['onConfigChange'] {
  return (configId, value) => {
    configuration.onConfigChange(configId, value);
    setConfigOptions((options) =>
      updateComposerSettings(options, configId, value),
    );
  };
}

export function heldConfiguration(width: number, agentIndex: number): Story {
  const recorded = heldChoiceCases[agentIndex];

  if (!recorded) throw new Error('Recorded catalog needs two Agents.');
  const onConfigChange = fn();
  const scenario = { width, recorded, onConfigChange };

  return {
    beforeEach: () => {
      onConfigChange.mockClear();
    },
    args: { configuration: heldConfigurationArgs(scenario) },
    render: (args) => <HeldConfiguration configuration={args.configuration} />,
    play: (context) => testHeldConfiguration(context, scenario),
  };
}

function heldConfigurationArgs({
  recorded,
  onConfigChange,
}: HeldScenario): Configuration {
  return {
    agent: recorded.agent,
    configOptions: recordedSessionOptions(recorded.agent.id),
    onConfigChange,
    turnRunning: true,
    checkout: { branch: 'main', newWorktree: false },
  };
}

async function testHeldConfiguration(
  context: PlayContext,
  scenario: HeldScenario,
): Promise<void> {
  await settleViewport(scenario.width);
  const overlay = within(document.body);
  const picker = configure(context, scenario.width);
  await picker.open();
  await waitFor(() => expect(overlay.getByText(heldNotice)).toBeVisible());
  const effortSteps = await selectHeldEffort(scenario, picker);
  await picker.chooseModel(scenario.recorded.narrower.name);
  await assertHeldFallback(scenario, effortSteps);
  await context.userEvent.keyboard('{Escape}');
}

async function selectHeldEffort(
  { recorded, onConfigChange }: HeldScenario,
  picker: Configure,
): Promise<string[][]> {
  const effortSteps = recorded.steps.map((step) => [
    recorded.effort.configId,
    step.value,
  ]);

  await picker.chooseEffort(
    recorded.offered.map((choice) => choice.name),
    recorded.selected.name,
  );
  await expect(onConfigChange.mock.calls).toEqual(effortSteps);

  return effortSteps;
}
