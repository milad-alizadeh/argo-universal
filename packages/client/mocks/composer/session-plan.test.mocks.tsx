import { expect, within, waitFor } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import type { PlayContext } from './composer-story-context.test.mocks';
import {
  planTitle,
  expandedAttribute,
} from './composer-test-contract.test.mocks';
type SessionStep = Pick<PlayContext, 'canvas'> & { width: number };
export async function expectSessionPath({
  canvas,
  width,
}: SessionStep): Promise<void> {
  await (width < wideBreakpoint()
    ? expect(
        canvas.queryByText('session', { exact: true }),
      ).not.toBeInTheDocument()
    : expect(canvas.getByText('session', { exact: true })).toBeVisible());
}
export async function expectOpenedPlan({
  canvas,
  width,
}: SessionStep): Promise<void> {
  const overlay = within(document.body);
  if (width < wideBreakpoint())
    await waitFor(() => expect(overlay.getByRole('dialog')).toBeVisible());
  else {
    await expect(overlay.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText(planTitle)).toBeVisible());
    await expect(canvas.getByRole('button', { name: 'Plan' })).toHaveAttribute(
      expandedAttribute,
      'true',
    );
  }
}
export async function closeRunningPlan({
  canvas,
  userEvent,
  width,
}: SessionStep & Pick<PlayContext, 'userEvent'>): Promise<void> {
  if (width < wideBreakpoint()) await userEvent.keyboard('{Escape}');
  else {
    await userEvent.click(canvas.getByRole('button', { name: 'Plan' }));
    await waitFor(() =>
      expect(canvas.queryByText(planTitle)).not.toBeVisible(),
    );
  }
}
