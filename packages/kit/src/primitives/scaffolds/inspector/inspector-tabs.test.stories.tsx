import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { ExampleTabsPane } from './inspector.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Inspector/Tabs',
  component: ExampleTabsPane,
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof ExampleTabsPane>;

export default meta;

type Story = StoryObj<typeof meta>;

const closeLabel = 'Close Inspector';

const expandLabel = 'Expand Inspector';

const changesTab = { name: 'Changes' };

const subagentsTab = { name: 'Subagents: 3' };

const closeSubagents = { name: 'Close Subagents' };

const selected = ['aria-selected', 'true'] as const;

// Tabs take the title's place, and closing the shown tab shows the next.
export const WideTabsSelectAndClose: Story = {
  render: () => <ExampleTabsPane />,
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('tab', changesTab);
    await expect(changes).toHaveAttribute(...selected);
    await expect(canvas.getByRole('button', closeSubagents)).toBeVisible();

    await userEvent.click(canvas.getByRole('tab', subagentsTab));
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );

    canvas.getByRole('button', closeSubagents).focus();
    await userEvent.keyboard('{Enter}');
    await expect(
      canvas.queryByRole('tab', subagentsTab),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('tab', changesTab)).toHaveAttribute(
      ...selected,
    );
    await expect(canvas.getByRole('tab', changesTab)).toHaveFocus();
  },
};

// Closing an inactive tab keeps the current panel selected and returns focus to it.
export const CloseInactiveTab: Story = {
  render: () => <ExampleTabsPane />,
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('tab', changesTab);
    await userEvent.click(canvas.getByRole('button', closeSubagents));
    await expect(
      canvas.queryByRole('tab', subagentsTab),
    ).not.toBeInTheDocument();
    await expect(changes).toHaveAttribute(...selected);
    await expect(changes).toHaveFocus();
  },
};

// Keyboard navigation reaches tabs beyond the faded edge without scrolling the pinned controls away.
export const OverflowTabsStayReachable: Story = {
  render: () => <ExampleTabsPane narrow />,
  play: async ({ canvas, userEvent }) => {
    const changes = await canvas.findByRole('tab', changesTab);
    changes.focus();
    await userEvent.keyboard('{End}');
    const shells = canvas.getByRole('tab', { name: 'Shells: 2' });
    await expect(shells).toHaveFocus();
    await expect(shells).toHaveAttribute(...selected);
    const close = canvas.getByRole('button', { name: closeLabel });
    const expand = canvas.getByRole('button', { name: expandLabel });
    await expect(close).toBeVisible();
    await expect(expand).toBeVisible();
    await waitFor(() =>
      expect(shells.getBoundingClientRect().right).toBeLessThanOrEqual(
        expand.getBoundingClientRect().left,
      ),
    );
    await userEvent.keyboard('{ArrowLeft}');
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(changes).toHaveFocus();
    await expect(changes).toHaveAttribute(...selected);
  },
};
