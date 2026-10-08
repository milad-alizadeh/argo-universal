import { newSessionCatalogs } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
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
    if (!selected)
      throw new Error(
        'Recorded catalog needs a default effort for every Agent.',
      );
    return { configuration, selected };
  },
);

function noEffortSelection(width: number, agentIndex: number): Story {
  const recorded = noSelectionCases[agentIndex];
  if (!recorded)
    throw new Error('Recorded catalog needs two Agents with effort.');
  const { configuration, selected } = recorded;
  return {
    args: { configuration },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: 'Agent and model' });
      await expect(trigger).not.toHaveTextContent(selected.name);
      await userEvent.click(trigger);
      const overlay = within(document.body);
      const heading = await overlay.findByText('No selection', { exact: true });
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
        overlay.getByRole('button', { name: `Set effort to ${selected.name}` }),
      );
      await expect(slider).toHaveAttribute('aria-valuetext', selected.name);
      await expect(
        overlay.getByRole('button', { name: `Set effort to ${selected.name}` }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(
        overlay.queryByText('No selection', { exact: true }),
      ).not.toBeInTheDocument();
      if (width === layoutWidths.wide)
        await expect(trigger).toHaveTextContent(selected.name);
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
