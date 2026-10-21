import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect } from 'storybook/test';
import { settleViewport } from '#lib/generic/settle-viewport';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { panelsSession } from './session-detail-view-panels.test.mocks';

const desktopWithStage = 1920;

const meta = {
  title: 'Tests/SessionDetailViewPanels',
  parameters: { screenPreview: true },
  args: { view: panelsSession },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleViewport(desktopWithStage),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const firstTitle = 'Find every Feed reader';

const selected = ['aria-selected', 'true'] as const;

const subagentsName = { name: 'Agents' };

const subagentsTab = { name: 'Agents: 4' };

const changesName = { name: 'Changes' };

async function openBoth({ canvas, userEvent }: Context): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', changesName));
  await userEvent.click(canvas.getByRole('button', subagentsName));
  await expect(await canvas.findByText(firstTitle)).toBeVisible();
}

// The Workbench card focuses an existing tab and restores its content without adding another tab.
export const FocusExistingTab: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('tab', changesName));
    await expect(canvas.queryByText(firstTitle)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', subagentsName));
    await expect(canvas.getAllByRole('tab', subagentsTab)).toHaveLength(1);
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
    await expect(canvas.getByText(firstTitle)).toBeVisible();
  },
};

// Expanding a Session's tabbed Inspector keeps its current panel selected.
export const ExpandSelectedPanel: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('button', { name: 'Expand Stage' }));
    await expect(
      await canvas.findByRole('button', { name: 'Restore Stage' }),
    ).toBeVisible();
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
  },
};

// Closing one tab returns to the remaining panel; closing the last removes the Inspector.
export const CloseTabs: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('button', { name: 'Close Agents' }));
    await expect(
      canvas.queryByRole('tab', subagentsTab),
    ).not.toBeInTheDocument();
    await expect(canvas.getByRole('tab', changesName)).toHaveAttribute(
      ...selected,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Changes' }),
    );
    await expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: 'Show Stage' }),
    ).toHaveAttribute('aria-pressed', 'false');
  },
};

// Closing the Inspector closes every tab, so the next opening starts with that panel alone.
export const CloseInspector: Story = {
  play: async (context) => {
    const { canvas, userEvent } = context;

    await openBoth(context);
    await userEvent.click(canvas.getByRole('button', { name: 'Hide Stage' }));
    await expect(canvas.queryByRole('tab')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', subagentsName));
    await expect(canvas.getAllByRole('tab')).toHaveLength(1);
    await expect(canvas.getByRole('tab', subagentsTab)).toHaveAttribute(
      ...selected,
    );
  },
};
