import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { registers } from '../custom-agent.mocks';
import { CustomAgentForm } from './custom-agent-form';

const meta = {
  title: 'Tests/Screens/Settings/Add custom Agent/Entry focus',
  component: CustomAgentForm,
  args: { submitLabel: 'Add Agent', onSubmit: registers(), onCancel: fn() },
  parameters: { screenPreview: true },
} satisfies Meta<typeof CustomAgentForm>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = keyof typeof layoutWidths;

function returnsFocusAt(layout: Layout, entry: string): Story {
  return {
    beforeEach: (): Promise<void> => settleViewport(layoutWidths[layout]),
    play: async ({ canvas, userEvent }) => {
      const trigger = canvas.getByRole('link', {
        name: `Add ${entry.toLowerCase()}`,
      });

      await userEvent.click(trigger);
      const body = within(document.body);
      await body.findByRole('dialog', { name: entry });
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(body.queryByRole('dialog', { name: entry })).toBeNull(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
    },
  };
}

export const ArgumentReturnsFocusOnPhone: Story = returnsFocusAt(
  'phone',
  'Argument',
);

export const ArgumentReturnsFocusOnDesktop: Story = returnsFocusAt(
  'wide',
  'Argument',
);

export const VariableReturnsFocusOnPhone: Story = returnsFocusAt(
  'phone',
  'Environment variable',
);

export const VariableReturnsFocusOnDesktop: Story = returnsFocusAt(
  'wide',
  'Environment variable',
);
