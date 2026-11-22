import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, screen, within } from 'storybook/test';
import { failedShell } from '../../../features/sessions/components/shell-list/shell-list.mocks';
import { subagentStates } from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import {
  followUps,
  issueFullView,
  issueRow,
  populated,
} from './session-workbench-sheet-fixtures';
import { WorkbenchSheetPreview } from './session-workbench-sheet.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchSheet',
  render: WorkbenchSheetPreview,
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleLayout('phone'),
  args: { content: populated },
} satisfies Meta<typeof WorkbenchSheetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

type User = Parameters<NonNullable<Story['play']>>[0]['userEvent'];

type Inside = ReturnType<typeof within>;

const agents = subagentStates.severalMixed;

const working = agents.filter(({ state }) => state !== 'idle');

const idle = agents.filter(({ state }) => state === 'idle');

const [firstIdle] = idle;

if (!working.length || !firstIdle)
  throw new Error('Recorded catalog needs working and idle Agents.');

const [shownFollowUp, secondFollowUp, laterFollowUp] = followUps.items;

if (!shownFollowUp || !secondFollowUp || !laterFollowUp)
  throw new Error('Recorded catalog needs three Follow-ups.');

const promptOf = ({ prompt }: typeof shownFollowUp): string =>
  prompt.find((block) => block.type === 'text')?.text ?? '';

type RowName = { name: RegExp };

const titled = (title: string): RowName => ({
  name: new RegExp(`^${title}(,|$)`),
});

async function openSheet(): Promise<Inside> {
  const sheet = await screen.findByRole('dialog', { name: 'Workbench' });

  await settleOverlays(sheet);

  return within(sheet);
}

// Presses the first row of that title: sections stack in the Workbench's order, so Agents' count comes before Background Tasks'.
async function press(sheet: Inside, user: User, title: string): Promise<void> {
  const [row] = sheet.getAllByRole('link', titled(title));

  if (!row) throw new Error(`No row titled ${title}.`);

  row.scrollIntoView({ block: 'nearest' });
  await settleOverlays(row);
  await user.click(row);
}

export const DrawsEachCardAsATitledSection: Story = {
  play: async () => {
    const sheet = await openSheet();

    const titles = [
      'Changes',
      'Agents',
      'Background Tasks',
      'Runs',
      'Follow-ups',
      'Issue Tracker',
    ].map((title) => sheet.getByText(title));

    for (const [at, title] of titles.entries()) {
      const next = titles[at + 1];

      if (next)
        await expect(title.compareDocumentPosition(next)).toBe(
          Node.DOCUMENT_POSITION_FOLLOWING,
        );
    }

    await expect(
      sheet.getByRole('link', { name: 'Changed files, 11' }),
    ).toBeVisible();
  },
};

export const PreviewsWorkingAgentsAndOpensEveryAgent: Story = {
  play: async ({ userEvent }) => {
    const sheet = await openSheet();

    const agentRow = (title: string): HTMLElement | null =>
      sheet.queryByRole('link', titled(title));

    for (const agent of working)
      await expect(agentRow(agent.title)).toBeVisible();

    await expect(agentRow(firstIdle.title)).toBeNull();

    await press(sheet, userEvent, `${idle.length} done`);
    await expect(
      await sheet.findByRole('heading', { name: 'Agents' }),
    ).toBeVisible();

    for (const agent of agents)
      await expect(agentRow(agent.title)).toBeVisible();

    await press(sheet, userEvent, firstIdle.title);
    await expect(
      await sheet.findByRole('heading', { name: firstIdle.title }),
    ).toBeVisible();
  },
};

export const PreviewsChangesAndOpensTheRest: Story = {
  play: async ({ userEvent }) => {
    const sheet = await openSheet();
    const later = { name: /^#46 / };

    await expect(sheet.getByRole('link', { name: /^#45 / })).toBeVisible();
    await expect(sheet.queryByRole('link', later)).toBeNull();
    await press(sheet, userEvent, '3 more');

    const row = await sheet.findByRole('link', later);
    row.scrollIntoView({ block: 'nearest' });
    await settleOverlays(row);
    await userEvent.click(row);
    await expect(
      await sheet.findByRole('heading', { name: 'Change #46' }),
    ).toBeVisible();
  },
};

export const AnnouncesEndedBackgroundTasks: Story = {
  args: { content: { ...populated, subagents: undefined } },
  play: async ({ userEvent }) => {
    const sheet = await openSheet();

    await press(sheet, userEvent, '2 done');

    const failed = await sheet.findByRole('link', {
      name: `${failedShell.command}, Exit 1`,
    });

    await expect(failed).toBeVisible();
    await expect(within(failed).queryByText('Exit 1')).toBeNull();
  },
};

export const PreviewsFollowUpsAndOpensTheirList: Story = {
  args: {
    content: {
      ...populated,
      schedules: {
        ...followUps,
        items: [
          shownFollowUp,
          { ...secondFollowUp, paused: true, state: 'paused' },
          laterFollowUp,
        ],
      },
    },
  },
  play: async ({ userEvent }) => {
    const sheet = await openSheet();

    await expect(
      sheet.getByRole('link', {
        name: `${promptOf(shownFollowUp)}, Every 5 min`,
      }),
    ).toBeVisible();

    const paused = sheet.getByRole('link', {
      name: `${promptOf(secondFollowUp)}, Paused`,
    });

    await expect(paused).toBeVisible();
    await expect(within(paused).queryByText('Paused')).toBeNull();

    await expect(
      sheet.queryByRole('link', titled(promptOf(laterFollowUp))),
    ).toBeNull();
    await expect(sheet.getByRole('link', titled('1 more'))).toBeVisible();

    await press(sheet, userEvent, 'Add follow-up');
    await expect(
      await sheet.findByRole('heading', { name: 'Follow-ups' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Add follow-up' }),
    ).toBeVisible();
  },
};

export const DrawsAPluginCardsRowsAndOpensItsFullView: Story = {
  play: async ({ userEvent }) => {
    const sheet = await openSheet();

    const issue = `${issueRow.title}, ${issueRow.value}`;

    await expect(sheet.getByRole('link', { name: issue })).toBeVisible();
    await expect(
      sheet.queryByRole('link', { name: 'Open Issue Tracker' }),
    ).toBeNull();

    await press(sheet, userEvent, issueRow.title);
    await expect(await sheet.findByText(issueFullView)).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Back to Workbench' }),
    ).toBeVisible();
  },
};
