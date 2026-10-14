import { expect, within, waitFor } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import type { PlayContext } from './composer-story-context.test.mocks';
import { chooseModelLabel } from './composer-test-contract.test.mocks';

export type PickerStep = Pick<PlayContext, 'canvas' | 'userEvent'> & {
  width: number;
};

export async function chooseModel({
  userEvent,
  width,
  name,
}: Omit<PickerStep, 'canvas'> & { name: string }): Promise<void> {
  const overlay = within(document.body);
  await userEvent.click(
    await overlay.findByRole('button', { name: chooseModelLabel }),
  );
  await userEvent.click(await overlay.findByRole('button', { name }));
  await waitFor(() =>
    expect(
      overlay.queryByRole('dialog', { name: 'Select Model' }),
    ).not.toBeInTheDocument(),
  );

  if (width < wideBreakpoint())
    await expect(
      await overlay.findByRole('button', { name: chooseModelLabel }),
    ).toBeVisible();
}

export async function expectEffortControlsVisible(): Promise<void> {
  const overlay = within(document.body);
  await waitFor(() =>
    expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible(),
  );
}
