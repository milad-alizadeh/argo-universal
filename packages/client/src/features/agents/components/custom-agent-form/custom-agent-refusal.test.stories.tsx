import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import type { SubmitCustomAgent } from '../../hooks/use-custom-agent-form';
import { customAgentDefinition, customAgentId } from '../custom-agent.mocks';
import { CustomAgentForm } from './custom-agent-form';

const refusal = 'Agent is in use. Close its Sessions and finish setup first.';
const edited = { ...customAgentDefinition, name: 'Renamed ACP' };
const meta = {
  title: 'Tests/Screens/Settings/Add custom Agent/Refused edits',
  component: CustomAgentForm,
  args: {
    initial: customAgentDefinition,
    submitLabel: 'Save',
    onSubmit: fn<SubmitCustomAgent>(),
    onCancel: fn(),
  },
  parameters: { screenPreview: true },
} satisfies Meta<typeof CustomAgentForm>;
export default meta;
type Story = StoryObj<typeof meta>;

function retriesRefusedEdit(layout: keyof typeof layoutWidths): Story {
  return {
    beforeEach: async ({ args }) => {
      args.onSubmit
        .mockRejectedValueOnce(new Error(refusal))
        .mockResolvedValue({ status: 'ready', agentId: customAgentId });
      await settleViewport(layoutWidths[layout]);
    },
    play: async ({ args, canvas, userEvent }) => {
      const name = canvas.getByLabelText('Name');
      await userEvent.clear(name);
      await userEvent.type(name, edited.name);
      await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
      await expect(await canvas.findByRole('alert')).toHaveTextContent(refusal);
      await expect(args.onSubmit).toHaveBeenNthCalledWith(1, edited);
      await expect(canvas.getByLabelText('Name')).toHaveValue(edited.name);
      await expect(canvas.getByLabelText('Executable')).toHaveValue(
        edited.executable,
      );
      const save = canvas.getByRole('button', { name: 'Save' });
      await expect(save).toBeEnabled();
      await userEvent.click(save);
      await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(2));
      await expect(args.onSubmit).toHaveBeenNthCalledWith(2, edited);
      await waitFor(() => expect(canvas.queryByRole('alert')).toBeNull());
    },
  };
}

export const RetriesARefusedEditOnPhone: Story = retriesRefusedEdit('phone');
export const RetriesARefusedEditOnDesktop: Story = retriesRefusedEdit('wide');
