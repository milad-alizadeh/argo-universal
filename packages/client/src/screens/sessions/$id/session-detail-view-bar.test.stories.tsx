import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import type { SessionBarProps } from '#features/sessions';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  attachedIssuesBar,
  coverageLine as coverage,
  deploysLine as deploys,
  detachableIssuesBar,
  firstDetachableIssue,
  secondDetachableIssue,
  issueLine as issue,
  secondIssueLine,
  sessionPageBar,
} from './session-detail-view-bar.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

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

const onOpenOf = (
  view: SessionDetailViewProps,
): SessionBarProps['onOpen'] | false | undefined =>
  view.state === 'open' && view.bar?.onOpen;

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

export const AttachedIssuesShareOneCard: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      bar: { ...attachedIssuesBar, onOpen: fn() },
    },
  },
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ args, canvas, userEvent }) => {
    const workbench = await findWorkbench(canvas);

    const card = within(
      await workbench.findByRole('group', {
        name: issue.pluginName,
        exact: true,
      }),
    );

    await expect(
      workbench.getAllByRole('group', { name: issue.pluginName, exact: true }),
    ).toHaveLength(1);

    for (const line of [issue, secondIssueLine]) {
      await expect(card.getByText(line.text)).toBeVisible();
      await userEvent.click(
        card.getByRole('button', {
          name: `Open ${line.pluginName}: ${line.text}`,
        }),
      );
      await expect(onOpenOf(args.view)).toHaveBeenLastCalledWith(line);
    }

    await expect(workbench.getByText(deploys.text)).toBeVisible();
  },
};

// Each Issue line has a "…" whose one item takes that Issue off the Session, and a Plugin's line without `detach` has none.
export const AnIssueLineCanBeDetached: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      bar: { ...detachableIssuesBar, onOpen: fn(), onDetach: fn() },
    },
  },
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: `Actions for ${secondDetachableIssue.text}`,
      }),
    );
    await settleOverlays();
    await userEvent.click(
      await within(document.body).findByRole('menuitem', {
        name: 'Detach from Session',
      }),
    );

    await expect(
      args.view.state === 'open' && args.view.bar?.onDetach,
    ).toHaveBeenLastCalledWith(secondDetachableIssue);
  },
};

// The "…" opens the menu with its one item, beside the line it belongs to.
export const AnIssueLineMenuShowsDetach: Story = {
  args: AnIssueLineCanBeDetached.args,
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', {
        name: `Actions for ${firstDetachableIssue.text}`,
      }),
    );
    await settleOverlays();

    await expect(
      await within(document.body).findByRole('menuitem', {
        name: 'Detach from Session',
      }),
    ).toBeVisible();
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

export const PhoneOpensAnAttachedIssueFromTheWorkbench: Story = {
  decorators: [withStack()],
  args: {
    view: {
      state: 'open',
      ...idleSession,
      bar: { ...attachedIssuesBar, onOpen: fn() },
    },
  },
  beforeEach: (): Promise<void> => settleLayout(layoutWidths.phone),
  play: async ({ args, canvas, userEvent }) => {
    const sheet = await openWorkbench({ canvas, userEvent });
    const first = await sheet.findByRole('link', { name: '#412, In review' });
    const second = sheet.getByRole('link', { name: '#413, Open' });

    await expect(sheet.getByText(issue.pluginName)).toBeVisible();
    await expect(first).toBeVisible();
    const [number = ''] = secondIssueLine.text.split(' · ');
    const label = within(second).getByText(number).getBoundingClientRect();
    const value = within(second).getByText('Open').getBoundingClientRect();

    await expect(label.right).toBeLessThanOrEqual(value.left);
    await expect(label.top).toBeLessThan(value.bottom);
    await expect(value.top).toBeLessThan(label.bottom);
    await settleOverlays(second);
    await userEvent.click(second);
    await expect(onOpenOf(args.view)).toHaveBeenCalledWith(secondIssueLine);
  },
};
