import type { ChangesSummary } from '@repo/contracts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import {
  firstTotals,
  laterTotals,
  LiveChangedSession,
  moreFilesEdited,
  turnStarted,
} from './session-changes-live.test.mocks';

// Wide enough for the Sessions list, the content column, the Workbench and the Inspector at once (layout.md).
const workbenchAndInspector = 2224;

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchChangesLive',
  parameters: { screenPreview: true },
  render: (): JSX.Element => <LiveChangedSession />,
  beforeEach: (): Promise<void> => {
    turnStarted();

    return settleLayout(workbenchAndInspector);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const totalsText = ({
  files,
  additions,
  deletions,
}: ChangesSummary): string[] => [
  `${files} files`,
  `+${additions}`,
  `−${deletions}`,
];

const card = (canvas: Canvas): ReturnType<typeof within> =>
  within(canvas.getByTestId('workbench-changes'));

async function expectCardTotals(
  canvas: Canvas,
  totals: ChangesSummary,
): Promise<void> {
  await waitFor(async () => {
    for (const text of totalsText(totals))
      await expect(card(canvas).getByText(text)).toBeVisible();
  });
}

/*
 * The card summarises the Checkout the Inspector reads, so it moves with the Turn rather than with the snapshot.
 * Before #1480 the page read nothing while no tab was shown and the card stayed on the snapshot's totals.
 */
export const CardFollowsTheCheckoutWithTheInspectorClosed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();
    await expectCardTotals(canvas, firstTotals);

    moreFilesEdited();

    await expectCardTotals(canvas, laterTotals);
    await expect(canvas.queryByRole('tab', { name: 'Changes' })).toBeNull();

    for (const text of totalsText(firstTotals))
      await expect(card(canvas).queryByText(text)).toBeNull();
  },
};

// Both surfaces count one reading of the Checkout, so neither can be ahead of the other while a Turn runs.
export const CardAndInspectorAgreeDuringATurn: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open Changes overview' }),
    );

    const panel = within(
      await canvas.findByRole('tabpanel', { name: 'Changes' }),
    );

    await expectCardTotals(canvas, firstTotals);

    moreFilesEdited();

    await expectCardTotals(canvas, laterTotals);
    await expect(panel.getByText(`+${laterTotals.additions}`)).toBeVisible();
    await expect(panel.getByText(`−${laterTotals.deletions}`)).toBeVisible();
    await expect(
      panel.getByText(`0/${laterTotals.files} viewed`),
    ).toBeVisible();
  },
};
