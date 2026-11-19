import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { screen, within } from 'storybook/test';
import type { Story } from '../../../../mocks/session-view/session-view-story.test.mocks';

type WorkbenchInteraction = Pick<
  Parameters<NonNullable<Story['play']>>[0],
  'canvas' | 'userEvent'
>;

export async function openWorkbench({
  canvas,
  userEvent,
}: WorkbenchInteraction): Promise<ReturnType<typeof within>> {
  await userEvent.click(
    await canvas.findByRole('button', { name: 'Workbench' }),
  );

  const menu = await screen.findByRole('menu');

  await settleOverlays(menu);

  return within(menu);
}

export async function openWorkbenchSection(
  context: WorkbenchInteraction,
  name: string,
): Promise<void> {
  const menu = await openWorkbench(context);
  const row = menu.getByRole('menuitem', { name });

  await settleOverlays(row);
  await context.userEvent.click(row);
}
