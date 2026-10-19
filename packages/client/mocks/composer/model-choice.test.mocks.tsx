import { expect, within, waitFor } from 'storybook/test';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import type { PlayContext } from './composer-story-context.test.mocks';
import { chooseModelLabel } from './composer-test-contract.test.mocks';

export type PickerStep = Pick<PlayContext, 'canvas' | 'userEvent'> & {
  width: number;
};

// A desktop's models stay open beside Configure after a pick, so later picks reuse them; a phone's page goes back.
export async function chooseModel({
  userEvent,
  width,
  name,
}: Omit<PickerStep, 'canvas'> & { name: string }): Promise<void> {
  const overlay = within(document.body);

  if (!openModels())
    await userEvent.click(
      await overlay.findByRole('button', { name: chooseModelLabel }),
    );
  const choice = await overlay.findByRole('radio', { name });
  await userEvent.click(choice);
  await (width >= wideBreakpoint()
    ? expect(choice).toHaveAttribute('aria-checked', 'true')
    : expectConfigureShown());
}

async function expectConfigureShown(): Promise<void> {
  await expect(
    await within(document.body).findByRole('button', {
      name: chooseModelLabel,
    }),
  ).toBeVisible();
}

// Radix marks a closing popover at once, before its exit transition ends.
function openModels(): boolean {
  return (
    within(document.body)
      .queryByRole('dialog', { name: 'Select Model' })
      ?.getAttribute('data-state') === 'open'
  );
}

export async function expectEffortControlsVisible(): Promise<void> {
  const overlay = within(document.body);
  await waitFor(() =>
    expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible(),
  );
}
