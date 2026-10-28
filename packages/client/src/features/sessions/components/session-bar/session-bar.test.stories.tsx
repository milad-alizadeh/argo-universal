import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, within } from 'storybook/test';
import { SessionColumn } from '#lib/product/session-column';
import { openLabel, SessionBar } from './session-bar';
import {
  coverageBar,
  deploysBar,
  issueBar,
  plainLine,
  threePlugins,
} from './session-bar-fixtures';

const meta = {
  title: 'Tests/Sessions/SessionBar',
  component: SessionBar,
  // In the Session's column, as the page draws it.
  decorators: [
    (Story): React.JSX.Element => (
      <SessionColumn>
        <Story />
      </SessionColumn>
    ),
  ],
  args: { ...threePlugins, onOpen: fn() },
} satisfies Meta<typeof SessionBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each hidden line behind "+N", named with the Plugin that sent it.
const hiddenRow = (pluginName: string, text: string): string =>
  `${pluginName}: ${text}`;

const listsHiddenLines = (width: number): Story => ({
  play: async ({ args, canvas, userEvent }) => {
    await settleLayout(width);
    await expect(canvas.getByText(issueBar.text)).toBeVisible();
    await expect(canvas.queryByText(deploysBar.text)).toBeNull();

    await userEvent.click(
      canvas.getByRole('button', { name: '2 more Plugin lines' }),
    );
    const menu = within(document.body);

    const deploys = await menu.findByRole('menuitem', {
      name: hiddenRow('Deploys', deploysBar.text),
    });

    // A line with no page has nothing to open.
    await expect(
      menu.getByRole('menuitem', {
        name: hiddenRow('Coverage', coverageBar.text),
      }),
    ).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(deploys);
    await expect(args.onOpen).toHaveBeenCalledWith(deploysBar);
  },
});

export const ListsHiddenLinesWithTheirPluginPhone = listsHiddenLines(
  layoutWidths.phone,
);

export const ListsHiddenLinesWithTheirPluginWide = listsHiddenLines(
  layoutWidths.wide,
);

export const OpensTheShownLinesPage: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: openLabel(issueBar) }),
    );
    await expect(args.onOpen).toHaveBeenCalledWith(issueBar);
  },
};

// Without a page, the line has no Open; and with no other Plugin, no "+N".
export const ALineWithNoPageHasNoOpen: Story = {
  args: plainLine,
  play: async ({ canvas }) => {
    await expect(canvas.getByText(coverageBar.text)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
