import { expect, waitFor } from 'storybook/test';
import {
  type Canvas,
  documentLabel,
  type PlayContext,
} from './plan-proposal-story-context.test.mocks';

export async function expandSheet(
  canvas: Canvas,
  userEvent: PlayContext['userEvent'],
): Promise<void> {
  const grip = canvas.getByRole('slider', { name: 'Sheet size' });
  const bounds = grip.getBoundingClientRect();
  grip.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      clientY: bounds.top + 12,
    }),
  );
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientY: bounds.top - 100 }),
  );
  await waitFor(() =>
    expect(grip).toHaveAttribute('aria-valuetext', 'Expanded'),
  );
  grip.focus();
  await userEvent.keyboard('{ArrowDown}');
  await waitFor(() =>
    expect(grip).toHaveAttribute('aria-valuetext', 'Compact'),
  );
}

export async function checkExpandedSheet(
  canvas: Canvas,
  userEvent: PlayContext['userEvent'],
): Promise<void> {
  const document = canvas.getByRole('region', { name: documentLabel });
  const height = document.getBoundingClientRect().height;
  const grip = canvas.getByRole('slider', { name: 'Sheet size' });
  grip.focus();
  await userEvent.keyboard('{ArrowUp}');
  await waitFor(() =>
    expect(document.getBoundingClientRect().height).toBeGreaterThan(height),
  );
  document.scrollTop = document.scrollHeight;
  await waitFor(() =>
    expect(document.scrollTop + document.clientHeight).toBeGreaterThanOrEqual(
      document.scrollHeight - 1,
    ),
  );
  const approve = canvas.getByRole('button', { name: 'Approve' });
  await waitFor(() =>
    expect(approve.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    ),
  );
  await expect(approve.getBoundingClientRect().top).toBeGreaterThanOrEqual(0);
  await expect(approve).toBeVisible();
}
