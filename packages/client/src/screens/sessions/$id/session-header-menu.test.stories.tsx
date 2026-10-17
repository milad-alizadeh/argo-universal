import { expect, screen, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import {
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = { ...sessionDetailViewTestMeta, title: 'Tests/SessionHeaderMenu' };

export default meta;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

type Layout = 'phone' | 'wide';

async function openHeaderMenu({
  canvas,
  userEvent,
}: PlayContext): Promise<ReturnType<typeof within>> {
  await userEvent.click(await canvas.findByRole('button', { name: 'More' }));

  return within(await screen.findByRole('menu'));
}

// ⋯ in the header opens Rename and Archive, as the Session's row does; each runs the page's action.
function renamesAndArchivesAt(layout: Layout): Story {
  return {
    args: { view: { state: 'open', ...idleSession } },
    beforeEach: () => settleViewport(layoutWidths[layout]),
    play: async (context) => {
      const { onRename, onArchive } =
        openProps(context.args.view).header.menu ?? {};

      const menu = await openHeaderMenu(context);
      await context.userEvent.click(
        menu.getByRole('menuitem', { name: 'Rename' }),
      );
      await expect(onRename).toHaveBeenCalled();

      const again = await openHeaderMenu(context);
      await context.userEvent.click(
        again.getByRole('menuitem', { name: 'Archive' }),
      );
      await expect(onArchive).toHaveBeenCalled();
    },
  };
}

export const RenamesAndArchivesOnPhone: Story = renamesAndArchivesAt('phone');

export const RenamesAndArchivesWide: Story = renamesAndArchivesAt('wide');
