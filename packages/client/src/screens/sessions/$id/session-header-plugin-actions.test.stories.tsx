import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, within } from 'storybook/test';
import type { SessionPluginActions } from '#features/sessions';
import {
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import { idleSession } from './session-detail-view.mocks';
import {
  desktopPluginActions,
  phonePluginActions,
  pluginActionsSession,
} from './session-header-actions.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/Screens/Sessions/Session/HeaderPluginActions',
};

export default meta;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const withPluginActions = (
  ...session: Parameters<typeof pluginActionsSession>
): Story['args'] => ({ view: pluginActionsSession(...session) });

const pluginActionsOf = ({ args }: PlayContext): SessionPluginActions => {
  const { pluginActions } = openProps(args.view).header;

  if (!pluginActions) throw new Error('The story needs Plugin actions.');

  return pluginActions;
};

async function openMore({
  canvas,
  userEvent,
}: PlayContext): Promise<ReturnType<typeof within>> {
  await userEvent.click(await canvas.findByRole('button', { name: 'More' }));

  return within(await screen.findByRole('menu'));
}

const menuLabels = (menu: ReturnType<typeof within>): string[] =>
  menu
    .getAllByRole('menuitem')
    .map(
      (item: HTMLElement) =>
        item.getAttribute('aria-label') ?? item.textContent ?? '',
    );

// A desktop shows the first Plugin action as a button; "…" holds Argo's Rename and Archive first, then the Plugins' rest.
export const DesktopOverflowsIntoMore: Story = {
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
      canvas.queryByRole('button', { name: 'Open preview' }),
    ).toBeNull();

    const more = await openMore(context);
    await expect(menuLabels(more)).toEqual([
      'Rename',
      'Archive',
      'Open preview',
      'Coverage report',
    ]);

    await userEvent.click(
      more.getByRole('menuitem', { name: 'Coverage report' }),
    );
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
      'Open preview',
      'Coverage report',
    ]);
  },
};

// With nothing of Argo's to offer, "…" still opens for the Plugins' menu actions.
export const MoreOpensForPluginsAlone: Story = {
  args: withPluginActions(desktopPluginActions(), {
    ...idleSession.header,
    menu: undefined,
  }),
  beforeEach: () => settleLayout('wide'),
  play: async (context) => {
    const more = await openMore(context);

    await expect(menuLabels(more)).toEqual(['Open preview', 'Coverage report']);
  },
};
