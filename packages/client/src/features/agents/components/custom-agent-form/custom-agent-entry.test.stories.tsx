import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { registers } from '../custom-agent.mocks';
import { CustomAgentForm } from './custom-agent-form';

const meta = {
  title: 'Tests/Screens/Settings/Add custom Agent/Entry errors',
  component: CustomAgentForm,
  args: { submitLabel: 'Add Agent', onSubmit: registers(), onCancel: fn() },
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
} satisfies Meta<typeof CustomAgentForm>;
export default meta;
type Story = StoryObj<typeof meta>;
type Play = Parameters<NonNullable<Story['play']>>[0];
type Canvas = Play['canvas'];
type UserEvent = Play['userEvent'];
type Act = (editor: Canvas, userEvent: UserEvent) => Promise<void>;

const nameError =
  'Use letters, digits and underscores, not starting with a digit.';

const leavesTheName: Act = async (editor, userEvent) => {
  await userEvent.click(editor.getByRole('textbox', { name: 'Name' }));
  await userEvent.tab();
};
const pressesSave: Act = (editor, userEvent) =>
  userEvent.click(editor.getByRole('button', { name: 'Save' }));

// A new variable opens without errors; its empty name's error waits, as the form's do, for the field to be left or Save.
function showsTheNameErrorAfter(act: Act): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('link', { name: 'Add environment variable' }),
      );
      const editor = within(
        await within(document.body).findByRole('dialog', {
          name: 'Environment variable',
        }),
      );
      await expect(editor.queryByText(nameError)).toBeNull();
      await act(editor, userEvent);
      await expect(await editor.findByText(nameError)).toBeVisible();
    },
  };
}

export const ShowsAnErrorOnceItsFieldIsLeft: Story =
  showsTheNameErrorAfter(leavesTheName);
export const ShowsEveryErrorWhenSaved: Story =
  showsTheNameErrorAfter(pressesSave);
