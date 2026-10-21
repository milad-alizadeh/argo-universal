import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { Inspector } from './inspector';
import {
  branchesText,
  contentText,
  ExampleInspector,
  HostedExampleInspector,
  inspectorTitle,
  openLabel,
} from './inspector.mocks';

const meta = {
  title: 'Tests/Inspector',
  component: Inspector,
  args: { title: inspectorTitle, open: false, onOpenChange: (): void => {} },
  render: (): ReactElement => <ExampleInspector />,
} satisfies Meta<typeof Inspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const at = (width: number, story: Story): Story => ({
  ...story,
  beforeEach: () => settleViewport(width),
});

const closeLabel = 'Close Inspector';

const expandLabel = 'Expand Inspector';

const sheetName = { name: inspectorTitle };

// Without a host, a wide Inspector is its own column beside the page, and its close button hands the page the closing.
export const WideOpensBesideThePage = at(layoutWidths.wide, {
  play: async ({ canvas, userEvent }) => {
    const toggle = await canvas.findByRole('button', { name: openLabel });
    await expect(
      canvas.queryByRole('heading', sheetName),
    ).not.toBeInTheDocument();

    await userEvent.click(toggle);

    await expect(await canvas.findByRole('heading', sheetName)).toBeVisible();
    await expect(canvas.getByText(contentText)).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Copy path' }),
    ).toBeVisible();
    await expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('button', { name: expandLabel }),
    ).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: closeLabel }));

    await expect(
      canvas.queryByRole('heading', sheetName),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByText(contentText)).not.toBeInTheDocument();
  },
});

// In a host such as the App Frame, the page draws nothing itself: the host's column draws it, with expand.
export const WideDrawsInTheHostsColumn = at(layoutWidths.wide, {
  render: () => <HostedExampleInspector />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openLabel }),
    );

    const column = await canvas.findByTestId('host-column');
    await expect(within(column).getByText(contentText)).toBeVisible();
    await expect(canvas.getByTestId('example-page')).not.toContainElement(
      within(column).getByText(contentText),
    );

    await userEvent.click(
      within(column).getByRole('button', { name: expandLabel }),
    );
    await expect(
      await within(column).findByRole('button', { name: 'Restore Inspector' }),
    ).toBeVisible();

    await userEvent.click(
      within(column).getByRole('button', { name: closeLabel }),
    );
    await waitFor(() =>
      expect(canvas.queryByTestId('host-column')).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByText(contentText)).not.toBeInTheDocument();
  },
});

// Under wide the same content opens in a Sheet over the page: no column, no expand, and the web's close button closes it.
export const TabletOpensASheet = at(layoutWidths.tablet, {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openLabel }),
    );

    const sheet = await screen.findByRole('dialog', sheetName);
    await waitFor(() =>
      expect(within(sheet).getByText(contentText)).toBeVisible(),
    );
    await expect(canvas.getByTestId('example-page')).toBeVisible();
    await expect(
      within(sheet).queryByRole('button', { name: expandLabel }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      within(sheet).getByRole('button', { name: closeLabel }),
    );

    await waitFor(() =>
      expect(screen.queryByRole('dialog', sheetName)).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByText(contentText)).not.toBeInTheDocument();
  },
});

// The sheet's root page takes a pushed page over it, and Back returns to the Inspector.
export const PhoneSheetPushesAPage = at(layoutWidths.phone, {
  render: () => <ExampleInspector initiallyOpen />,
  play: async ({ userEvent }) => {
    const sheet = await screen.findByRole('dialog', sheetName);

    await userEvent.click(
      await within(sheet).findByRole('button', { name: 'Show branches' }),
    );
    await expect(await within(sheet).findByText(branchesText)).toBeVisible();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(within(sheet).getByText(contentText)).toBeVisible(),
    );
  },
});
