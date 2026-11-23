import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, within } from 'storybook/test';
import {
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
  titleTrigger,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session/HeaderMenu',
};

export default meta;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

type Layout = 'phone' | 'wide';

// A phone's header holds ⋯; a wide window's title, in the title bar, opens the same menu.
async function headerMenuTrigger(
  { canvas }: PlayContext,
  layout: Layout,
): Promise<HTMLElement> {
  if (layout === 'phone') {
    return canvas.findByRole('button', { name: 'More' });
  }

  return titleTrigger(canvas);
}

async function openHeaderMenu(
  context: PlayContext,
  layout: Layout,
): Promise<ReturnType<typeof within>> {
  await context.userEvent.click(await headerMenuTrigger(context, layout));

  return within(await screen.findByRole('menu'));
}

// The header's menu opens Rename and Archive, as the Session's row does; each runs the page's action.
function renamesAndArchivesAt(layout: Layout): Story {
  return {
    args: { view: { state: 'open', ...idleSession } },
    beforeEach: () => settleLayout(layout),
    play: async (context) => {
      const { onRename, onArchive } =
        openProps(context.args.view).header.menu ?? {};

      const menu = await openHeaderMenu(context, layout);
      await context.userEvent.click(
        menu.getByRole('menuitem', { name: 'Rename' }),
      );
      await expect(onRename).toHaveBeenCalled();

      const again = await openHeaderMenu(context, layout);
      await context.userEvent.click(
        again.getByRole('menuitem', { name: 'Archive' }),
      );
      await expect(onArchive).toHaveBeenCalled();
    },
  };
}

export const RenamesAndArchivesOnPhone: Story = renamesAndArchivesAt('phone');

export const RenamesAndArchivesWide: Story = renamesAndArchivesAt('wide');
