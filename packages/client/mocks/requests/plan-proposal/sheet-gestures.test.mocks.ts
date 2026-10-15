import { expect } from 'storybook/test';
import type {
  Canvas,
  PlayContext,
} from './plan-proposal-story-context.test.mocks';

export async function checkProtectedSheet(
  canvas: Canvas,
  userEvent: PlayContext['userEvent'],
): Promise<void> {
  await userEvent.keyboard('{Escape}');
  await expect(
    canvas.getByRole('dialog', { name: 'Plan proposal' }),
  ).toBeVisible();
}
