import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, within } from 'storybook/test';
import type { SessionPluginActions } from '#features/sessions';
import {
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
  titleTrigger,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { idleSession } from './session-detail-view.mocks';
import {
  desktopPluginActions,
  menuLabels,
  phonePluginActions,
  pluginActionsSession,
} from './session-header-actions.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session/HeaderPluginActions',
};

export default meta;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const openPreview = 'Open preview';

const coverageReport = 'Coverage report';

const withPluginActions = (
  ...session: Parameters<typeof pluginActionsSession>
): Story['args'] => ({ view: pluginActionsSession(...session) });

const pluginActionsOf = ({ args }: PlayContext): SessionPluginActions => {
  const { pluginActions } = openProps(args.view).header;

  if (!pluginActions) throw new Error('The story needs Plugin actions.');

  return pluginActions;
};

async function openMenu(
  { userEvent }: PlayContext,
  trigger: HTMLElement,
): Promise<ReturnType<typeof within>> {
  await userEvent.click(trigger);

  return within(await screen.findByRole('menu'));
}

const openMore = async (context: PlayContext) =>
  openMenu(
    context,
    await context.canvas.findByRole('button', { name: 'More' }),
  );

// A wide window's title, in the title bar, opens what a phone's ⋯ holds.
const openTitleMenu = async (context: PlayContext) =>
  openMenu(context, await titleTrigger(context.canvas));

// A desktop shows the first Plugin action as a button; the title's menu holds Argo's Rename and Archive first, then the Plugins' rest.
export const DesktopOverflowsIntoTitleMenu: Story = {
  args: withPluginActions(desktopPluginActions()),
  beforeEach: () => settleLayout('wide'),
  play: async (context) => {
    const { canvas, userEvent } = context;
    const { beside, menu } = pluginActionsOf(context);

    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open #412' }),
    );
    await expect(beside[0]?.onPress).toHaveBeenCalled();
    await expect(
      canvas.queryByRole('button', { name: openPreview }),
    ).toBeNull();

    await expect(
      context.canvas.queryByRole('button', { name: 'More' }),
    ).toBeNull();

    const more = await openTitleMenu(context);
    await expect(menuLabels(more)).toEqual([
      'Rename',
      'Archive',
      openPreview,
      coverageReport,
    ]);

    await userEvent.click(more.getByRole('menuitem', { name: coverageReport }));
    await expect(menu[1]?.onPress).toHaveBeenCalled();
  },
};

// A phone keeps every Plugin action inside "…", after Argo's own.
export const PhoneKeepsAllInMore: Story = {
  args: withPluginActions(phonePluginActions()),
  beforeEach: () => settleLayout('phone'),
  play: async (context) => {
    await expect(
      context.canvas.queryByRole('button', { name: 'Open #412' }),
    ).toBeNull();

    const more = await openMore(context);
    await expect(menuLabels(more)).toEqual([
      'Rename',
      'Archive',
      'Open #412',
      openPreview,
      coverageReport,
    ]);
  },
};

// With nothing of Argo's to offer, the title's menu still opens for the Plugins' menu actions.
export const TitleMenuOpensForPluginsAlone: Story = {
  args: withPluginActions(desktopPluginActions(), {
    ...idleSession.header,
    menu: undefined,
  }),
  beforeEach: () => settleLayout('wide'),
  play: async (context) => {
    const more = await openTitleMenu(context);

    await expect(menuLabels(more)).toEqual([openPreview, coverageReport]);
  },
};
