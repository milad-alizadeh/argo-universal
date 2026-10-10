import { newSessionCatalogs } from '@repo/mocks/app';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  composerLongAgentCatalog,
  composerLongListConfiguration,
  composerLongModelList,
  composerNoEffortSelections,
} from '../../mocks/composer-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import { NoEffortSelection } from './composer-configuration.stories';

const noSelectionLabel = 'No selection';
const agentModelLabel = 'Agent and model';
const modelsScrollId = 'composer-models-scroll';

const meta = {
  title: 'Tests/ComposerConfiguration',
  component: ComposerAgentModelControl,
  render: NoEffortSelection.render,
  args: { disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;
export default meta;
type Story = StoryObj<typeof meta>;

const noSelectionCases = composerNoEffortSelections.map(
  (configuration, agentIndex) => {
    const recorded = newSessionCatalogs.bothAvailable[agentIndex];
    const option = recorded?.configOptions.find(
      (entry) => entry.category === 'thought_level' && entry.type === 'select',
    );
    const selected =
      option?.type === 'select'
        ? option.options
            .flatMap((entry) => ('groupId' in entry ? entry.options : [entry]))
            .find((entry) => entry.value === option.currentValue)
        : undefined;
    if (!selected || !option)
      throw new Error(
        'Recorded catalog needs a default effort for every Agent.',
      );
    return { configuration, selected, configId: option.configId };
  },
);

function noEffortSelection(width: number, agentIndex: number): Story {
  const recorded = noSelectionCases[agentIndex];
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
        await expect(trigger).not.toHaveTextContent(selected.name);
        await userEvent.click(trigger);
        const overlay = within(document.body);
        const heading = await overlay.findByText(noSelectionLabel, {
          exact: true,
        });
        await waitFor(() => expect(heading).toBeVisible());
        const slider = overlay.getByRole('slider', { name: 'Effort' });
        await expect(slider).toHaveAttribute(
          'aria-valuetext',
          noSelectionLabel,
        );
        for (const button of overlay.getAllByRole('button', {
          name: /^Set effort to /,
        }))
          await expect(button).toHaveAttribute('aria-pressed', 'false');
        await expect(
          overlay.queryByRole('switch', { name: 'Fast mode' }),
        ).not.toBeInTheDocument();
        await userEvent.click(
          overlay.getByRole('button', {
            name: `Set effort to ${selected.name}`,
          }),
        );
        await expect(onConfigChange).toHaveBeenCalledWith(
          configId,
          selected.value,
        );
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
          overlay.getByRole('button', {
            name: `Set effort to ${selected.name}`,
          }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(
          overlay.queryByText(noSelectionLabel, { exact: true }),
        ).not.toBeInTheDocument();
        if (width === layoutWidths.wide)
          await expect(trigger).toHaveTextContent(selected.name);
      } finally {
        root.unmount();
      }
    },
  };
}
export const NoEffortSelectionPhoneFirstAgent = noEffortSelection(
  layoutWidths.phone,
  0,
);
export const NoEffortSelectionPhoneSecondAgent = noEffortSelection(
  layoutWidths.phone,
  1,
);
export const NoEffortSelectionWideFirstAgent = noEffortSelection(
  layoutWidths.wide,
  0,
);
export const NoEffortSelectionWideSecondAgent = noEffortSelection(
  layoutWidths.wide,
  1,
);

const lastLongModel = composerLongModelList.at(-1);
const lastLongAgent = composerLongAgentCatalog.at(-1);
const shortConfiguration = composerNoEffortSelections[0];
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
