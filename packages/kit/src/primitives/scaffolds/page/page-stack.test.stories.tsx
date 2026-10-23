import type { Meta } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import { withStack } from '#story-stack';
import { Page } from './index';
import {
  DetailPage,
  HeaderActionsPage,
  PushPage,
  SettingsPage,
  onAction,
} from './page-stack.mocks';
import { atWidth, pageWidths as widths } from './page-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Page/Stack',
  component: Page,
  parameters: { screenPreview: true },
} satisfies Meta<typeof Page>;

export default meta;

// The stack's header carries the Page's title, its two direct Actions and the overflow menu with the rest.
export const HeaderActionsPhone = atWidth(widths.Phone, {
  decorators: [withStack()],
  render: () => <HeaderActionsPage />,
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
  decorators: [withStack({ detail: DetailPage })],
  render: () => <PushPage />,
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

// The page picker opens from the settings form, filters by search, and the choice shows on its row.
export const PagePickerChoosesPhone = atWidth(widths.Phone, {
  decorators: [withStack()],
  render: () => <SettingsPage />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: /^Project/ }),
    );

    const page = within(canvasElement.ownerDocument.body);

    const search = await page.findByRole('searchbox', {
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
