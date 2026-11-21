import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import presentationMeta, {
  Disabled,
  Secondary,
} from './icon-button-menu.stories';

const meta = {
  ...presentationMeta,
  title: 'Tests/Design System/Primitives/Actions/IconButtonMenu',
};

export default meta;

type Story = StoryObj<typeof meta>;

const name = 'Add';

const onChosen = fn();

const actions = [
  { label: 'Action one', onPress: fn() },
  { label: 'Action two', onPress: onChosen },
];

export const ChoosingRunsTheAction: Story = {
  ...Secondary,
  args: { ...Secondary.args, actions },
  play: async ({ canvas, canvasElement, userEvent }) => {
    onChosen.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name }));
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Action two' }),
    );
    await expect(onChosen).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(page.queryByRole('menu')).not.toBeInTheDocument(),
    );
  },
};

export const DisabledOpensNothing: Story = {
  ...Disabled,
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole('button', { name });
    await expect(button).toBeDisabled();
    button.click();
    await expect(
      within(canvasElement.ownerDocument.body).queryByRole('menu'),
    ).not.toBeInTheDocument();
  },
};
