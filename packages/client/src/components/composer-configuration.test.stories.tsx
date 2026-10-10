import type { SessionConfigSelectOption } from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  composerFastModeConfiguration,
  composerLongAgentCatalog,
  composerLongListConfiguration,
  composerLongModelList,
  composerUnlistedEffortConfigurations,
} from '../../mocks/composer-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import { DefaultEffort } from './composer-configuration.stories';

const agentModelLabel = 'Agent and model';
const modelsScrollId = 'composer-models-scroll';

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
        await expect(slider).toHaveAttribute('aria-valuetext', selected.name);
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
          expect(slider).toHaveAttribute('aria-valuetext', selected.name),
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
    const agents = overlay.getByTestId('composer-agents-scroll');
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
    for (const testId of [modelsScrollId, 'composer-agents-scroll']) {
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
      await userEvent.click(fast);
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
