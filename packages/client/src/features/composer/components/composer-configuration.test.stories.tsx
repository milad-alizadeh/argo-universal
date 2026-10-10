import type { SessionConfigSelectOption } from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import { chooseEffort } from '../../../../mocks/choose-effort';
import {
  composerFastModeConfiguration,
  composerLongAgentCatalog,
  composerLongListConfiguration,
  composerLongModelList,
  composerUnlistedEffortConfigurations,
  updateComposerSettings,
} from '../../../../mocks/composer-mock';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import { DefaultEffort } from './composer-configuration.stories';

const agentModelLabel = 'Agent and model';
const modelsScrollId = 'composer-models-scroll';
const agentsScrollId = 'composer-agents-scroll';
const effortValue = 'aria-valuetext';
const chooseAgentLabel = 'Choose Agent';
const heldNotice = 'A Turn is running. Changes apply from the next Turn.';

const meta = {
  title: 'Tests/ComposerConfiguration',
  component: ComposerAgentModelControl,
  render: DefaultEffort.render,
  args: { disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;
export default meta;
type Story = StoryObj<typeof meta>;

const defaultEffortCases = composerUnlistedEffortConfigurations.map(
  (configuration, agentIndex) => {
    const recorded = newSessionCatalogs.bothAvailable[agentIndex];
    const flat = (
      option: NonNullable<typeof recorded>['configOptions'][number] | undefined,
    ): SessionConfigSelectOption[] =>
      option?.type === 'select'
        ? option.options.flatMap((entry) =>
            'groupId' in entry ? entry.options : [entry],
          )
        : [];
    const model = recorded?.configOptions.find(
      (entry) => entry.category === 'model',
    );
    const option = recorded?.configOptions.find(
      (entry) => entry.category === 'thought_level' && entry.type === 'select',
    );
    const supported = flat(model).find(
      (entry) => entry.value === model?.currentValue,
    )?._meta?.argo?.supportedEffortLevels;
    const offered = flat(option).filter(
      (entry) => !supported || supported.includes(entry.value),
    );
    // The Agent's value is not a level at all, so the slider rests on the middle offered level.
    const selected = offered[Math.floor(offered.length / 2)];
    if (!selected || !option || offered.length < 2)
      throw new Error(
        'Recorded catalog needs at least two effort levels for every Agent.',
      );
    return { configuration, selected, configId: option.configId };
  },
);

function defaultEffort(width: number, agentIndex: number): Story {
  const recorded = defaultEffortCases[agentIndex];
  if (!recorded)
    throw new Error('Recorded catalog needs two Agents with effort.');
  const { configuration, selected, configId } = recorded;
  return {
    args: { configuration },
    render: () => (
      <View testID="controlled-configuration" className="w-full p-4" />
    ),
    play: async ({ canvas, userEvent }) => {
      const root = createRoot(canvas.getByTestId('controlled-configuration'));
      const onConfigChange = fn();
      const render = (
        configuration: NonNullable<
          React.ComponentProps<
            typeof ComposerAgentModelControl
          >['configuration']
        >,
      ): void =>
        root.render(
          <SafeAreaProvider>
            <ComposerAgentModelControl
              disabled={false}
              configuration={{ ...configuration, onConfigChange }}
            />
            <PortalHost />
          </SafeAreaProvider>,
        );
      try {
        render(configuration);
        await settleViewport(width);
        const trigger = await canvas.findByRole('button', {
          name: agentModelLabel,
        });
        await userEvent.click(trigger);
        const overlay = within(document.body);
        const slider = await overlay.findByRole('slider', { name: 'Effort' });
        await waitFor(() => expect(slider).toBeVisible());
        await expect(slider).toHaveAttribute(effortValue, selected.name);
        await expect(
          overlay.queryByText('No selection', { exact: true }),
        ).not.toBeInTheDocument();
        await expect(
          overlay.queryByRole('switch', { name: 'Fast mode' }),
        ).not.toBeInTheDocument();
        await waitFor(() =>
          expect(onConfigChange).toHaveBeenCalledWith(configId, selected.value),
        );
        // The phone shows the description behind an info button; desktop shows it under Effort.
        const description = 'More effort trades speed for deeper reasoning.';
        if (width === layoutWidths.wide) {
          await expect(
            overlay.queryByRole('button', { name: 'About effort' }),
          ).not.toBeInTheDocument();
        } else {
          await expect(
            overlay.queryByText(description, { exact: true }),
          ).not.toBeInTheDocument();
          await userEvent.click(
            overlay.getByRole('button', { name: 'About effort' }),
          );
        }
        const tip = await overlay.findByText(description, { exact: true });
        await waitFor(() => expect(tip).toBeVisible());
        render({
          ...configuration,
          configOptions: configuration.configOptions.map((option) =>
            option.configId === configId && option.type === 'select'
              ? { ...option, currentValue: selected.value }
              : option,
          ),
        });
        await waitFor(() =>
          expect(slider).toHaveAttribute(effortValue, selected.name),
        );
        await expect(
          overlay.getAllByText(selected.name, { exact: true }).length,
        ).toBeGreaterThan(0);
        if (width === layoutWidths.wide)
          await expect(trigger).toHaveTextContent(selected.name);
      } finally {
        root.unmount();
      }
    },
  };
}
export const DefaultEffortPhoneFirstAgent = defaultEffort(
  layoutWidths.phone,
  0,
);
export const DefaultEffortPhoneSecondAgent = defaultEffort(
  layoutWidths.phone,
  1,
);
export const DefaultEffortWideFirstAgent = defaultEffort(layoutWidths.wide, 0);
export const DefaultEffortWideSecondAgent = defaultEffort(layoutWidths.wide, 1);

const lastLongModel = composerLongModelList.at(-1);
const lastLongAgent = composerLongAgentCatalog.at(-1);
const shortConfiguration = composerUnlistedEffortConfigurations[0];
if (!lastLongModel || !lastLongAgent || !shortConfiguration)
  throw new Error(
    'Recorded catalog needs long and short Agent and model lists.',
  );

function longListConfiguration(): NonNullable<
  React.ComponentProps<typeof ComposerAgentModelControl>['configuration']
> {
  return {
    ...composerLongListConfiguration,
    onConfigChange: fn(),
    onAgentChange: fn(),
  };
}

// Keeps the test's own callbacks, which the presentation render replaces with actions.
function renderArgs(
  args: React.ComponentProps<typeof ComposerAgentModelControl>,
): React.JSX.Element {
  return (
    <View className="p-4">
      <ComposerAgentModelControl {...args} />
    </View>
  );
}

// The fades belong to the list they sit beside.
function fades(scroll: HTMLElement): {
  top: HTMLElement | null;
  bottom: HTMLElement | null;
} {
  const list = within(scroll.parentElement ?? scroll);
  return {
    top: list.queryByTestId('scroll-fade-top'),
    bottom: list.queryByTestId('scroll-fade-bottom'),
  };
}

async function expectScrollsUnderFades(
  scroll: HTMLElement,
  last: HTMLElement | (() => Promise<HTMLElement>),
): Promise<HTMLElement> {
  await waitFor(() =>
    expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight),
  );
  await waitFor(() => expect(fades(scroll).bottom).toBeVisible());
  await expect(fades(scroll).top).toBeNull();
  scroll.scrollTop = scroll.scrollHeight;
  const item = typeof last === 'function' ? await last() : last;
  await waitFor(async () => {
    // Rows measured on the way may grow the content, which moves the end.
    scroll.scrollTop = scroll.scrollHeight;
    const box = item.getBoundingClientRect();
    const viewport = scroll.getBoundingClientRect();
    await expect(box.top).toBeGreaterThanOrEqual(viewport.top);
    await expect(box.bottom).toBeLessThanOrEqual(viewport.bottom);
  });
  await waitFor(() => expect(fades(scroll).bottom).toBeNull());
  await expect(fades(scroll).top).toBeVisible();
  return item;
}

export const LongListsScrollUnderFadesWide: Story = {
  args: { configuration: longListConfiguration() },
  render: renderArgs,
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    const models = await overlay.findByTestId(modelsScrollId);
    const agents = overlay.getByTestId(agentsScrollId);
    await expect(
      overlay.getByRole('dialog').getBoundingClientRect().bottom,
    ).toBeLessThanOrEqual(window.innerHeight);
    await waitFor(() =>
      expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible(),
    );
    const lastModel = await expectScrollsUnderFades(models, () =>
      overlay.findByRole('button', { name: lastLongModel.name }),
    );
    await userEvent.click(lastModel);
    await expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
      expect.any(String),
      lastLongModel.value,
    );
    const lastAgent = await expectScrollsUnderFades(agents, () =>
      overlay.findByRole('button', { name: `Select ${lastLongAgent.label}` }),
    );
    await userEvent.click(lastAgent);
    await expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
      lastLongAgent.agent,
    );
    await userEvent.keyboard('{Escape}');
  },
};

// The phone sheet scrolls as a whole, so the last row of each page is reachable.
export const LongListsReachableInPhoneSheet: Story = {
  args: { configuration: longListConfiguration() },
  render: renderArgs,
  play: async ({ canvas, userEvent, args }) => {
    await settleViewport(layoutWidths.phone);
    const overlay = within(document.body);
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    const lastVisible = async (name: string): Promise<HTMLElement> => {
      const row = await overlay.findByRole('button', { name });
      row.scrollIntoView({ block: 'end' });
      await waitFor(async () => {
        const box = row.getBoundingClientRect();
        await expect(box.top).toBeGreaterThanOrEqual(0);
        await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight);
      });
      return row;
    };
    await userEvent.click(trigger);
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Choose model' }),
    );
    await userEvent.click(await lastVisible(lastLongModel.name));
    await expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
      expect.any(String),
      lastLongModel.value,
    );
    await userEvent.click(
      await overlay.findByRole('button', { name: 'Choose Agent' }),
    );
    await userEvent.click(await lastVisible(`Select ${lastLongAgent.label}`));
    await expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
      lastLongAgent.agent,
    );
    await expect(overlay.queryByTestId(modelsScrollId)).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
  },
};

export const ShortListsHaveNoFadesWide: Story = {
  args: { configuration: shortConfiguration },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    const overlay = within(document.body);
    await userEvent.click(
      canvas.getByRole('button', { name: agentModelLabel }),
    );
    for (const testId of [modelsScrollId, agentsScrollId]) {
      const scroll = await overlay.findByTestId(testId);
      await waitFor(() =>
        expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight),
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(overlay.queryByTestId('scroll-fade-top')).toBeNull();
    await expect(overlay.queryByTestId('scroll-fade-bottom')).toBeNull();
    await userEvent.keyboard('{Escape}');
  },
};

// Fast mode is a switch in the menu, and the trigger carries a bolt while it is on.
function fastMode(width: number): Story {
  return {
    args: {
      configuration: {
        ...composerFastModeConfiguration(false),
        onConfigChange: fn(),
      },
    },
    render: renderArgs,
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(width);
      const overlay = within(document.body);
      const trigger = canvas.getByRole('button', { name: agentModelLabel });
      await expect(
        within(trigger).queryByTestId('fast-mode-on'),
      ).not.toBeInTheDocument();
      await userEvent.click(trigger);
      const fast = await overlay.findByRole('switch', { name: 'Fast mode' });
      await waitFor(() => expect(fast).toBeVisible());
      await expect(fast).not.toBeChecked();
      // The phone shows the description behind an info button; desktop shows it under the name.
      const description = 'Quicker replies, at a higher cost';
      if (width !== layoutWidths.wide) {
        await expect(
          overlay.queryByText(description, { exact: true }),
        ).not.toBeInTheDocument();
        await userEvent.click(
          overlay.getByRole('button', { name: 'About fast mode' }),
        );
      }
      const tip = await overlay.findByText(description, { exact: true });
      await waitFor(() => expect(tip).toBeVisible());
      await expect(args.configuration?.onConfigChange).not.toHaveBeenCalled();
      // The whole row turns the option on, not just the switch.
      await userEvent.click(within(fast).getByText('Fast mode'));
      await expect(args.configuration?.onConfigChange).toHaveBeenCalledOnce();
      await expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
        'fast',
        true,
      );
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const FastModeSwitchPhone = fastMode(layoutWidths.phone);
export const FastModeSwitchWide = fastMode(layoutWidths.wide);

export const FastModeOnMarksTrigger: Story = {
  args: { configuration: composerFastModeConfiguration(true) },
  render: renderArgs,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: agentModelLabel });
    await expect(within(trigger).getByTestId('fast-mode-on')).toBeVisible();
  },
};

type Configuration = NonNullable<
  React.ComponentProps<typeof ComposerAgentModelControl>['configuration']
>;

// Probes the Agents again on Retry, as a screen does, and finds them available.
function RetryingConfiguration({
  configuration,
}: {
  configuration: Configuration;
}): React.JSX.Element {
  const [agents, setAgents] = useState(configuration.agents);
  return (
    <View className="p-4">
      <ComposerAgentModelControl
        disabled={false}
        configuration={{
          ...configuration,
          agents,
          onAgentRetry: () => {
            configuration.onAgentRetry?.();
            setAgents(newSessionCatalogs.bothAvailable);
          },
        }}
      />
    </View>
  );
}

// A New Session can switch Agent; a started Session keeps its Agent, so every row stays disabled.
function unavailableAgentRetry(
  width: number,
  agentIndex: number,
  session: 'new' | 'started',
): Story {
  const agent = newSessionCatalogs.bothUnavailable[agentIndex];
  const other = newSessionCatalogs.bothUnavailable.find(
    (entry) => entry.agent !== agent?.agent,
  );
  if (!agent?.installStep || !other)
    throw new Error(
      'Recorded catalog needs two unavailable Agents with a reason.',
    );
  const { installStep } = agent;
  const onAgentChange = fn();
  const onAgentRetry = fn();
  return {
    beforeEach: () => {
      onAgentChange.mockClear();
      onAgentRetry.mockClear();
    },
    args: {
      configuration: {
        agents: newSessionCatalogs.bothUnavailable,
        agent: agent.agent,
        configOptions: agent.configOptions,
        onConfigChange: fn(),
        onAgentChange: session === 'new' ? onAgentChange : undefined,
        onAgentRetry,
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    render: (args) => (
      <RetryingConfiguration configuration={args.configuration} />
    ),
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const overlay = within(document.body);
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
      );
      if (width === layoutWidths.phone)
        await userEvent.click(
          await overlay.findByRole('button', { name: chooseAgentLabel }),
        );
      const row = await overlay.findByRole('button', {
        name: `Select ${agent.label}`,
      });
      await waitFor(() => expect(row).toBeVisible());
      await expect(row).toBeDisabled();
      await expect(
        within(row).getByText('Unavailable', { exact: true }),
      ).toBeVisible();
      await expect(within(row).getByText(installStep)).toBeVisible();
      await expect(
        overlay.getByRole('button', { name: `Select ${other.label}` }),
      ).toBeDisabled();
      const retry = overlay.getByRole('button', {
        name: `Retry ${agent.label}`,
      });
      await expect(retry).toHaveTextContent('Retry');
      await expect(
        overlay.queryByText('Install', { exact: true }),
      ).not.toBeInTheDocument();
      // Every row and its Retry stay reachable inside the desktop menu.
      if (width === layoutWidths.wide)
        await waitFor(async () => {
          const menu = overlay
            .getByTestId(agentsScrollId)
            .getBoundingClientRect();
          for (const unavailable of newSessionCatalogs.bothUnavailable) {
            const choice = overlay
              .getByRole('button', { name: `Select ${unavailable.label}` })
              .getBoundingClientRect();
            const action = overlay
              .getByRole('button', { name: `Retry ${unavailable.label}` })
              .getBoundingClientRect();
            await expect(choice.top).toBeGreaterThanOrEqual(menu.top);
            await expect(action.bottom).toBeLessThanOrEqual(menu.bottom);
          }
        });
      await userEvent.click(retry);
      await expect(onAgentRetry).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(
          overlay.queryByText('Unavailable', { exact: true }),
        ).not.toBeInTheDocument(),
      );
      await expect(overlay.queryByText(installStep)).not.toBeInTheDocument();
      await expect(
        overlay.queryByRole('button', { name: `Retry ${agent.label}` }),
      ).not.toBeInTheDocument();
      for (const label of [agent.label, other.label]) {
        const choice = overlay.getByRole('button', { name: `Select ${label}` });
        if (session === 'new') await expect(choice).toBeEnabled();
        else await expect(choice).toBeDisabled();
      }
      await expect(onAgentChange).not.toHaveBeenCalled();
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const UnavailableAgentRetryPhoneFirstAgent = unavailableAgentRetry(
  layoutWidths.phone,
  0,
  'new',
);
export const UnavailableAgentRetryPhoneSecondAgent = unavailableAgentRetry(
  layoutWidths.phone,
  1,
  'new',
);
export const UnavailableAgentRetryWideFirstAgent = unavailableAgentRetry(
  layoutWidths.wide,
  0,
  'new',
);
export const UnavailableAgentRetryWideSecondAgent = unavailableAgentRetry(
  layoutWidths.wide,
  1,
  'new',
);
export const StartedSessionAgentRetryPhoneFirstAgent = unavailableAgentRetry(
  layoutWidths.phone,
  0,
  'started',
);
export const StartedSessionAgentRetryPhoneSecondAgent = unavailableAgentRetry(
  layoutWidths.phone,
  1,
  'started',
);
export const StartedSessionAgentRetryWideFirstAgent = unavailableAgentRetry(
  layoutWidths.wide,
  0,
  'started',
);
export const StartedSessionAgentRetryWideSecondAgent = unavailableAgentRetry(
  layoutWidths.wide,
  1,
  'started',
);

// Each recorded Agent's levels for a Turn-time change: the slider's steps to a level the narrower model lacks, and where effort then falls.
const heldChoiceCases = newSessionCatalogs.bothAvailable.map((agent) => {
  const select = (category: string): SessionConfigSelectOption[] => {
    const option = agent.configOptions.find(
      (entry) => entry.category === category && entry.type === 'select',
    );
    return option?.type === 'select'
      ? option.options.flatMap((entry) =>
          'groupId' in entry ? entry.options : [entry],
        )
      : [];
  };
  const model = agent.configOptions.find(
    (option) => option.category === 'model',
  );
  const effort = agent.configOptions.find(
    (option) => option.category === 'thought_level',
  );
  const models = select('model');
  const efforts = select('thought_level');
  const levels =
    models.find((choice) => choice.value === model?.currentValue)?._meta?.argo
      ?.supportedEffortLevels ?? [];
  const narrower = models.find(
    (choice) =>
      choice._meta?.argo?.supportsEffort &&
      levels.some(
        (level) => !choice._meta?.argo?.supportedEffortLevels?.includes(level),
      ),
  );
  const narrowerLevels = narrower?._meta?.argo?.supportedEffortLevels ?? [];
  const offered = efforts.filter((choice) => levels.includes(choice.value));
  const selected = offered.find(
    (choice) =>
      choice.value !== effort?.currentValue &&
      !narrowerLevels.includes(choice.value),
  );
  const current = offered.findIndex(
    (choice) => choice.value === effort?.currentValue,
  );
  const target = selected ? offered.indexOf(selected) : -1;
  // The slider moves one level at a time, and each move is a change.
  const steps =
    target > current
      ? offered.slice(current + 1, target + 1)
      : offered.slice(target, current).reverse();
  // The narrower model lacks the chosen level: effort falls to the highest level it offers below it, else its middle level.
  const narrowerOffered = efforts.filter((choice) =>
    narrowerLevels.includes(choice.value),
  );
  const fallback =
    narrowerOffered.findLast(
      (choice) =>
        selected && efforts.indexOf(choice) < efforts.indexOf(selected),
    ) ?? narrowerOffered[Math.floor(narrowerOffered.length / 2)];
  if (
    !model ||
    !effort ||
    !narrower ||
    !selected ||
    !fallback ||
    current < 0 ||
    steps.length === 0
  )
    throw new Error(
      'Recorded catalog needs two model effort ranges and an effort outside the narrower range.',
    );
  return { agent, model, effort, narrower, selected, fallback, steps, offered };
});

// Applies each change, as the Session's snapshot would.
function HeldConfiguration({
  configuration,
}: {
  configuration: Configuration;
}): React.JSX.Element {
  const [configOptions, setConfigOptions] = useState(
    configuration.configOptions,
  );
  return (
    <View className="p-4">
      <ComposerAgentModelControl
        disabled={false}
        configuration={{
          ...configuration,
          configOptions,
          onConfigChange: (configId, value) => {
            configuration.onConfigChange(configId, value);
            setConfigOptions((options) =>
              updateComposerSettings(options, configId, value),
            );
          },
        }}
      />
    </View>
  );
}

function heldConfiguration(width: number, agentIndex: number): Story {
  const recorded = heldChoiceCases[agentIndex];
  if (!recorded) throw new Error('Recorded catalog needs two Agents.');
  const { agent, model, effort, narrower, selected, fallback, steps, offered } =
    recorded;
  const onConfigChange = fn();
  return {
    beforeEach: () => {
      onConfigChange.mockClear();
    },
    args: {
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: agent.agent,
        configOptions: agent.configOptions,
        onConfigChange,
        turnRunning: true,
        checkout: { branch: 'main', newWorktree: false },
      },
    },
    render: (args) => <HeldConfiguration configuration={args.configuration} />,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const overlay = within(document.body);
      await userEvent.click(
        canvas.getByRole('button', { name: agentModelLabel }),
      );
      await waitFor(() => expect(overlay.getByText(heldNotice)).toBeVisible());
      const effortSteps = steps.map((step) => [effort.configId, step.value]);
      await chooseEffort(
        await overlay.findByRole('slider', { name: 'Effort' }),
        offered.map((choice) => choice.name),
        selected.name,
      );
      await expect(onConfigChange.mock.calls).toEqual(effortSteps);
      if (width === layoutWidths.phone)
        await userEvent.click(
          overlay.getByRole('button', { name: 'Choose model' }),
        );
      await userEvent.click(
        await overlay.findByRole('button', { name: narrower.name }),
      );
      // The narrower model lacks the chosen level, so the control commits the level it falls to.
      await waitFor(() =>
        expect(onConfigChange.mock.calls).toEqual([
          ...effortSteps,
          [model.configId, narrower.value],
          [effort.configId, fallback.value],
        ]),
      );
      await waitFor(() =>
        expect(overlay.getByRole('slider', { name: 'Effort' })).toHaveAttribute(
          effortValue,
          fallback.name,
        ),
      );
      await expect(
        overlay.queryByText(selected.name, { exact: true }),
      ).not.toBeInTheDocument();
      await expect(overlay.getByText(heldNotice)).toBeVisible();
      await userEvent.keyboard('{Escape}');
    },
  };
}
export const HeldConfigurationPhoneFirstAgent = heldConfiguration(
  layoutWidths.phone,
  0,
);
export const HeldConfigurationPhoneSecondAgent = heldConfiguration(
  layoutWidths.phone,
  1,
);
export const HeldConfigurationWideFirstAgent = heldConfiguration(
  layoutWidths.wide,
  0,
);
export const HeldConfigurationWideSecondAgent = heldConfiguration(
  layoutWidths.wide,
  1,
);
