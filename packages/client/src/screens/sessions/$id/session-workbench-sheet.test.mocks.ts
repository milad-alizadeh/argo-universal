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

  const sheet = await screen.findByRole('dialog', { name: 'Workbench' });

  await settleOverlays(sheet);

  return within(sheet);
}
