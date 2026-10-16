import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { SettingsPage } from '#lib/product/settings-page';
import { registers } from '../custom-agent.mocks';
import { CustomAgentForm } from './custom-agent-form';

const meta = {
  title: 'Tests/Screens/Settings/Custom Agent layout retention',
  component: CustomAgentForm,
  args: { submitLabel: 'Add Agent', onSubmit: registers(), onCancel: fn() },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
} satisfies Meta<typeof CustomAgentForm>;

export default meta;

type Story = StoryObj<typeof meta>;

const argument = { name: 'Argument' };

const addArgument = { name: 'Add argument' };

const exampleName = 'Example ACP';

const executable = 'example-acp';

async function openedEditor(): Promise<ReturnType<typeof within>> {
  return within(await within(document.body).findByRole('dialog', argument));
}

// The real Settings page must retain the form and its entry editor when a window crosses its wide breakpoint.
export const KeepsDraftAcrossLayoutChanges: Story = {
  render: (args) => (
    <SettingsPage title="Add custom Agent">
      <CustomAgentForm {...args} />
    </SettingsPage>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('Name'), exampleName);
    await userEvent.type(canvas.getByLabelText('Executable'), executable);
    await userEvent.click(canvas.getByRole('link', addArgument));
    const savedEntry = await openedEditor();
    await userEvent.type(savedEntry.getByRole('textbox', argument), '--acp');
    await userEvent.click(savedEntry.getByRole('button', { name: 'Save' }));
    await expect(
      await canvas.findByRole('link', { name: '--acp' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('link', addArgument));
    let editor = await openedEditor();
    await userEvent.type(editor.getByRole('textbox', argument), '--draft');

    for (const width of [layoutWidths.tablet, layoutWidths.wide]) {
      await settleViewport(width);
      await expect(canvas.getByLabelText('Name')).toHaveValue(exampleName);
      await expect(canvas.getByLabelText('Executable')).toHaveValue(executable);
      await expect(canvas.getByText('--acp', { exact: true })).toBeVisible();
      editor = await openedEditor();
      await expect(editor.getByRole('textbox', argument)).toHaveValue(
        '--draft',
      );
    }
  },
};
