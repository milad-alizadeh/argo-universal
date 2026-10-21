import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, screen, waitFor } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Sheet } from './sheet';
import { useSheet } from './sheet-pages';

const ignore = (): void => {};

const detailsPage = { name: 'Details' };

// Content that draws its own header, such as the Inspector's, pushing a page of its own.
function PushesDetails(): ReactElement {
  const sheet = useSheet();

  return (
    <Button
      label="Show details"
      onPress={() =>
        sheet.push({
          name: 'details',
          title: detailsPage.name,
          children: <Text>Details page</Text>,
        })
      }
    />
  );
}

function UntitledRootSheet(): ReactElement {
  return (
    <Sheet open onOpenChange={ignore} label="Inspector" bottomEdge>
      <Sheet.Page name="root">
        <PushesDetails />
      </Sheet.Page>
    </Sheet>
  );
}

const meta = {
  title: 'Tests/Sheet/Root page',
  component: UntitledRootSheet,
} satisfies Meta<typeof UntitledRootSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// An untitled root page draws no header; a page pushed over it does, with Back to the root.
export const UntitledRootPushesAPage: Story = {
  play: async ({ userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await screen.findByRole('dialog', { name: 'Inspector' });
    await expect(screen.queryByRole('heading')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }));
    await expect(await screen.findByRole('heading', detailsPage)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() =>
      expect(screen.queryByRole('heading', detailsPage)).toBeNull(),
    );
    await expect(
      screen.getByRole('button', { name: 'Show details' }),
    ).toBeVisible();
  },
};
