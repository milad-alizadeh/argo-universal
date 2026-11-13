import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  coverageLine as coverage,
  deploysLine as deploys,
  issueLine as issue,
  sessionPageBar,
} from './session-detail-view-bar.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Bar',
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

const lines = [issue, deploys, coverage];

const workbenchId = 'desktop-workbench';

// The strip's "+2", which only the strip under a phone's header draws.
const moreLines = '2 more Plugin lines';

// A card opens its Plugin's page, so it is spoken as the strip's Open is.
const openName = (pluginName: string): string => `Open ${pluginName}`;

type Canvas = ReturnType<typeof within>;

const findWorkbench = async (canvas: Canvas): Promise<Canvas> =>
  within(await canvas.findByTestId(workbenchId));

// A wide window draws no strip under the header: each Plugin's line is its own Workbench card (#2012).
export const WideLinesAreWorkbenchCards: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    const workbench = await findWorkbench(canvas);

    for (const line of lines)
      await expect(workbench.getByText(line.text)).toBeVisible();

    await expect(canvas.getAllByText(issue.text)).toHaveLength(1);
    await expect(canvas.queryByRole('button', { name: moreLines })).toBeNull();
  },
};

export const PressingACardOpensItsPluginPage: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: openName(issue.pluginName) }),
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
    await (await findWorkbench(canvas)).findByText(coverage.text);

    await expect(
      canvas.queryByRole('button', { name: openName(coverage.pluginName) }),
    ).toBeNull();
  },
};

// Hiding the Workbench hides its cards, these with them; nothing comes back under the header.
export const HidingTheWorkbenchHidesTheLines: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas, userEvent }) => {
    await (await findWorkbench(canvas)).findByText(issue.text);

    await userEvent.click(
      canvas.getByRole('button', { name: 'Toggle Workbench' }),
    );

    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(canvas.getAllByText(issue.text)).toHaveLength(1);
    await expect(canvas.queryByRole('button', { name: moreLines })).toBeNull();
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
