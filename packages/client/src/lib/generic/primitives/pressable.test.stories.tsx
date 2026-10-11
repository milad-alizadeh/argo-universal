import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { DropdownMenuPreview } from './dropdown-menu-preview.mocks';

const meta = { title: 'Tests/Pressable' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const MenuTrigger: Story = {
  render: () => <DropdownMenuPreview />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole('button', { name: 'Open' });
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(trigger);
    const profile = await body.findByRole('menuitem', { name: /Profile/ });
    await waitFor(() => expect(profile).toBeVisible());
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('menu')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    const firstItem = await body.findByRole('menuitem', { name: /Profile/ });
    await waitFor(() => expect(firstItem).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(body.queryByRole('menu')).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
