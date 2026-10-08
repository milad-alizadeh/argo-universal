import { newSessionCatalogs } from '@repo/api/mocks';
import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, waitFor, within } from 'storybook/test';
import { composerNoEffortSelections } from '../../mocks/composer-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { settleViewport } from '../../mocks/settle-viewport';
import { ComposerAgentModelControl } from './composer-configuration';
import { NoEffortSelection } from './composer-configuration.stories';

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
          name: 'Agent and model',
        });
        await expect(trigger).not.toHaveTextContent(selected.name);
        await userEvent.click(trigger);
        const overlay = within(document.body);
        const heading = await overlay.findByText('No selection', {
          exact: true,
        });
        await waitFor(() => expect(heading).toBeVisible());
        const slider = overlay.getByRole('slider', { name: 'Effort' });
        await expect(slider).toHaveAttribute('aria-valuetext', 'No selection');
        await expect(getComputedStyle(slider).backgroundImage).toBe('none');
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
          overlay.queryByText('No selection', { exact: true }),
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
