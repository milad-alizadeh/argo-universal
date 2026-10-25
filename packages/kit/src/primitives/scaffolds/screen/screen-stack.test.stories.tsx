import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { withStack } from '#story-stack';
import { Screen } from './index';
import {
  DetailScreen,
  HeaderActionsScreen,
  MenuRootScreen,
  PushScreen,
  SearchScreen,
  SettingsScreen,
  onAction,
  onSearch,
} from './screen-stack.mocks';
import { atWidth, screenWidths as widths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/Stack',
  component: Screen,
  parameters: { screenPreview: true },
} satisfies Meta<typeof Screen>;

export default meta;

// The stack's header carries the Screen's title, its two direct Actions and the overflow menu with the rest.
export const HeaderActionsPhone = atWidth(widths.Phone, {
  decorators: [withStack()],
  render: () => <HeaderActionsScreen />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    onAction.mockClear();
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Title' })).toBeVisible(),
    );
    await expect(canvas.getByRole('button', { name: 'Filters' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    // The menu draws in a portal, outside the story's canvas.
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Delete' }),
    );
    await expect(onAction).toHaveBeenCalledOnce();
  },
});

// A pushed page replaces the root's header, and Back returns to the root.
export const PushAndBackPhone = atWidth(widths.Phone, {
  decorators: [withStack({ detail: DetailScreen })],
  render: () => <PushScreen />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open detail' }),
    );
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Detail' })).toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('link', { name: /back/i }));
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Open detail' })).toBeVisible(),
    );
    await expect(canvas.queryByRole('heading', { name: 'Detail' })).toBeNull();
  },
});

// A root with the App's menu has ☰; the page it pushes has Back and no ☰.
export const MenuRootPushesBackPhone = atWidth(widths.Phone, {
  decorators: [withStack({ detail: DetailScreen })],
  render: () => <MenuRootScreen />,
  play: async ({ canvas, userEvent }) => {
    onAction.mockClear();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open navigation' }),
    );
    await expect(onAction).toHaveBeenCalledOnce();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open detail' }),
    );
    await waitFor(() =>
      expect(canvas.getByRole('heading', { name: 'Detail' })).toBeVisible(),
    );
    await expect(canvas.getByRole('link', { name: /back/i })).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Open navigation' }),
    ).toBeNull();
  },
});

// The header's search opens into a field over the title row and filters as you type.
export const SearchInHeaderPhone = atWidth(widths.Phone, {
  decorators: [withStack()],
  render: () => <SearchScreen />,
  play: async ({ canvas, userEvent }) => {
    onSearch.mockClear();
    await expect(
      await canvas.findByRole('heading', { name: 'Title' }),
    ).toBeVisible();
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Search Items' }),
    );
    await userEvent.type(
      await canvas.findByRole('textbox', { name: 'Search Items' }),
      'fix',
    );
    await expect(onSearch).toHaveBeenLastCalledWith('fix');
  },
});

// The page picker pushes its page on the stack with Back; its header search filters, and the choice shows on its row after Back.
export const ScreenPickerChoosesPhone = atWidth(widths.Phone, {
  decorators: [withStack()],
  render: () => <SettingsScreen />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: /^Project/ }),
    );

    const page = within(canvasElement.ownerDocument.body);

    await userEvent.click(
      await page.findByRole('button', { name: 'Search Project' }),
    );

    const search = await page.findByRole('textbox', {
      name: 'Search Project',
    });

    await userEvent.type(search, 'ma');
    await expect(page.queryByRole('radio', { name: /^Oak/ })).toBeNull();
    await userEvent.click(await page.findByRole('radio', { name: /Maple/ }));
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: /^Project/ }),
      ).toHaveTextContent('Maple'),
    );
  },
});
