import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, within } from 'storybook/test';
import {
  meta as sessionViewMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { coverageCardSummary } from './sections/plugin-card.mocks';
import { workbenchMenuSession } from './session-detail-view-panels.test.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  ...sessionViewMeta,
  title: 'Tests/Screens/Sessions/Session/HeaderWorkbench',
  args: { view: workbenchMenuSession },
  beforeEach: (): Promise<void> => settleLayout('phone'),
};

export default meta;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

async function openWorkbench({
  canvas,
  userEvent,
}: PlayContext): Promise<ReturnType<typeof within>> {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Workbench' }),
  );

  const menu = await screen.findByRole('menu');

  await settleOverlays(menu);

  return within(menu);
}

export const ListsAvailableSectionsInOrder: Story = {
  play: async (context) => {
    const menu = await openWorkbench(context);
    const labels = ['Changes', 'Agents', 'Background Tasks', 'Coverage'];
    const entries = labels.map((name) => menu.getByRole('menuitem', { name }));

    await expect(menu.getAllByRole('menuitem')).toEqual(entries);
    await expect(entries[0]).toHaveAccessibleDescription('4');
    await expect(entries[1]).toHaveAccessibleDescription(
      String(workbenchMenuSession.subagents.subagents.length),
    );
    await expect(entries[2]).toHaveAccessibleDescription(
      String(workbenchMenuSession.shells.shells.length),
    );
  },
};

export const OmitsSectionsWithoutWork: Story = {
  args: { view: { state: 'open', ...idleSession } },
  play: async (context) => {
    const menu = await openWorkbench(context);

    await expect(menu.getAllByRole('menuitem')).toHaveLength(1);
    await expect(
      menu.getByRole('menuitem', { name: /^Changes/ }),
    ).toBeVisible();
  },
};

function opensSheet(label: string, body?: string): Story {
  return {
    play: async (context) => {
      const menu = await openWorkbench(context);
      const row = menu.getByRole('menuitem', { name: new RegExp(`^${label}`) });
      await settleOverlays(row);
      await context.userEvent.click(row);

      const sheet = await screen.findByRole('dialog', { name: label });
      await expect(sheet).toBeVisible();

      if (body) await expect(within(sheet).getByText(body)).toBeVisible();
    },
  };
}

export const OpensChanges = opensSheet('Changes');

export const OpensAgents = opensSheet('Agents');

export const OpensBackgroundTasks = opensSheet('Background Tasks');

export const OpensPluginCard = opensSheet('Coverage', coverageCardSummary);

export const UsesTheExistingWorkbenchOnWideWindows: Story = {
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('button', { name: 'Toggle Workbench' }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Workbench' }),
    ).toBeNull();
  },
};
