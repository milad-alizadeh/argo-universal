import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within, waitFor } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { StartSessionIn } from './start-session-in';
import contextMeta from './start-session-in.stories';

const meta = {
  ...contextMeta,
  title: 'Tests/New Session Agent picker',
} satisfies Meta<typeof StartSessionIn>;

export default meta;

type Story = StoryObj<typeof meta>;

const pickerLabel = 'Select Agent';

function selectAgent(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent, args }) => {
      const first = args.agents[0],
        second = args.agents[1];

      if (!first || !second) throw new Error('Picker fixture needs two Agents');
      const trigger = canvas.getByRole('button', { name: pickerLabel });
      await userEvent.click(trigger);
      const overlay = within(document.body);
      await expect(
        overlay.getByRole('button', { name: first.name }),
      ).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(overlay.getByRole('button', { name: second.name }));
      await waitFor(() =>
        expect(args.onAgentChange).toHaveBeenCalledWith(second.id),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      await userEvent.click(trigger);
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
      );
      await expect(trigger).toHaveFocus();
    },
  };
}

function addAgents(width: number): Story {
  return {
    args: { agents: [], agent: undefined },
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas, userEvent, args }) => {
      await expect(
        canvas.getByRole('button', { name: pickerLabel }),
      ).toHaveTextContent(pickerLabel);
      await userEvent.click(canvas.getByRole('button', { name: pickerLabel }));
      const overlay = within(document.body);
      await userEvent.click(
        overlay.getByRole('button', { name: 'Add Agents' }),
      );
      await waitFor(() => expect(args.onAddAgents).toHaveBeenCalledOnce());
    },
  };
}

export const SelectWide = selectAgent(layoutWidths.wide);

export const SelectPhone = selectAgent(layoutWidths.phone);

export const AddWithZeroAgentsWide = addAgents(layoutWidths.wide);

export const AddWithZeroAgentsPhone = addAgents(layoutWidths.phone);
