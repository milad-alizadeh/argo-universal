import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, within } from 'storybook/test';
import type { SessionDetailViewProps } from './session-detail-view';
import { sessionPageBar } from './session-detail-view-bar.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/SessionBar',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...idleSession,
      bar: { ...sessionPageBar, onOpen: fn() },
    },
  },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const issue = sessionPageBar.shown;

const workbenchId = 'desktop-workbench';

// The strip's "+2", which only the strip under the header draws.
const moreLines = '2 more Plugin lines';

// A wide window draws no strip under the header: each Plugin's line is its own Workbench card (#2012).
export const WideLinesAreWorkbenchCards: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    const workbench = within(await canvas.findByTestId(workbenchId));

    await expect(workbench.getByText(issue.text)).toBeVisible();
    await expect(workbench.getByText('Preview ready')).toBeVisible();
    await expect(workbench.getByText('78% covered')).toBeVisible();
    await expect(canvas.getAllByText(issue.text)).toHaveLength(1);
    await expect(canvas.queryByRole('button', { name: moreLines })).toBeNull();
  },
};

export const PressingACardOpensItsPluginPage: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: 'Open Issue tracker overview',
      }),
    );

    await expect(
      args.view.state === 'open' && args.view.bar?.onOpen,
    ).toHaveBeenCalledWith(issue);
  },
};

// A line with no page draws a card that opens nothing.
export const ALineWithNoPageOpensNothing: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    await within(await canvas.findByTestId(workbenchId)).findByText(
      '78% covered',
    );

    await expect(
      canvas.queryByRole('button', { name: 'Open Coverage overview' }),
    ).toBeNull();
  },
};

// A phone has no Workbench column, so the line keeps its strip under the header.
export const PhoneKeepsTheStrip: Story = {
  beforeEach: (): Promise<void> => settleLayout(layoutWidths.phone),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(issue.text)).toBeVisible();
    await expect(canvas.getByRole('button', { name: moreLines })).toBeVisible();
  },
};

// A wide window whose Workbench is hidden keeps the strip, so the lines are never shown nowhere.
export const HiddenWorkbenchKeepsTheStrip: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas, userEvent }) => {
    await within(await canvas.findByTestId(workbenchId)).findByText(issue.text);
    await expect(canvas.queryByRole('button', { name: moreLines })).toBeNull();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle Workbench' }),
    );

    await expect(
      await canvas.findByRole('button', { name: moreLines }),
    ).toBeVisible();
  },
};
