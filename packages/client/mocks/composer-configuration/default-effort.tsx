import type { SessionConfigOption } from '@repo/contracts';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PortalHost } from '#primitives/overlays/portal/portal';
import { ComposerAgentModelControl } from '../../src/features/composer/components/composer-configuration/composer-configuration';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  agentModelLabel,
  type Story,
  type Configuration,
  type PlayContext,
} from './common';
import {
  assertDefaultEffort,
  assertCommittedDefaultEffort,
  type DefaultEffortScenario,
} from './default-effort-assertions';
import {
  defaultEffortCases,
  type DefaultEffortCase,
} from './default-effort-cases';

export function defaultEffort(width: number, agentIndex: number): Story {
  const recorded = defaultEffortCases[agentIndex];

  if (!recorded)
    throw new Error('Recorded catalog needs two Agents with effort.');

  return {
    args: { configuration: recorded.configuration },
    render: () => (
      <View testID="controlled-configuration" className="w-full p-4" />
    ),
    play: (context) => testDefaultEffort(context, { width, recorded }),
  };
}

async function testDefaultEffort(
  context: PlayContext,
  scenario: DefaultEffortScenario,
): Promise<void> {
  const root = createRoot(
    context.canvas.getByTestId('controlled-configuration'),
  );

  const controlled = controlledConfiguration(root);

  try {
    await runDefaultEffort(context, scenario, controlled);
  } finally {
    root.unmount();
  }
}

interface ControlledConfiguration {
  render: (configuration: Configuration) => void;
  onConfigChange: Configuration['onConfigChange'];
}

async function runDefaultEffort(
  context: PlayContext,
  scenario: DefaultEffortScenario,
  controlled: ControlledConfiguration,
): Promise<void> {
  controlled.render(scenario.recorded.configuration);
  const controls = await openDefaultEffort(context, scenario.width);
  await assertDefaultEffort(
    controls.slider,
    scenario.recorded,
    controlled.onConfigChange,
  );
  controlled.render(committedDefaultEffort(scenario.recorded));
  await assertCommittedDefaultEffort(controls, scenario);
}

function renderControlledConfiguration(
  root: ReturnType<typeof createRoot>,
  configuration: Configuration,
  onConfigChange: Configuration['onConfigChange'],
): void {
  root.render(
    <SafeAreaProvider>
      <ComposerAgentModelControl
        disabled={false}
        configuration={{ ...configuration, onConfigChange }}
      />
      <PortalHost />
    </SafeAreaProvider>,
  );
}

async function openDefaultEffort(
  { canvas, userEvent }: PlayContext,
  width: number,
): Promise<{ trigger: HTMLElement; slider: HTMLElement }> {
  await settleViewport(width);
  const trigger = await canvas.findByRole('button', { name: agentModelLabel });
  await userEvent.click(trigger);

  const slider = await within(document.body).findByRole('slider', {
    name: 'Effort',
  });

  await waitFor(() => expect(slider).toBeVisible());

  return { trigger, slider };
}

function committedDefaultEffort({
  configuration,
  configId,
  selected,
}: DefaultEffortCase): Configuration {
  return {
    ...configuration,
    configOptions: configuration.configOptions.map((option) =>
      committedOption(option, { configId, selected }),
    ),
  };
}

function committedOption(
  option: SessionConfigOption,
  recorded: Pick<DefaultEffortCase, 'configId' | 'selected'>,
): SessionConfigOption {
  return option.configId === recorded.configId && option.type === 'select'
    ? { ...option, currentValue: recorded.selected.value }
    : option;
}

function controlledConfiguration(
  root: ReturnType<typeof createRoot>,
): ControlledConfiguration {
  const onConfigChange = fn();

  const render = (configuration: Configuration): void =>
    renderControlledConfiguration(root, configuration, onConfigChange);

  return { render, onConfigChange };
}
