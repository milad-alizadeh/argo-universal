import { expect, waitFor, within, fn } from 'storybook/test';
import { effortValue, heldNotice } from './common';
import { heldChoiceCases } from './held-cases';
type HeldCase = (typeof heldChoiceCases)[number];
export interface HeldScenario {
  recorded: HeldCase;
  width: number;
  onConfigChange: ReturnType<typeof fn>;
}
export async function assertHeldFallback(
  { recorded, onConfigChange }: HeldScenario,
  effortSteps: string[][],
): Promise<void> {
  const overlay = within(document.body);
  await assertFallbackCalls(recorded, onConfigChange, effortSteps);
  await assertFallbackValue(recorded.fallback.name);
  await expect(
    overlay.queryByText(recorded.selected.name, { exact: true }),
  ).not.toBeInTheDocument();
  await expect(overlay.getByText(heldNotice)).toBeVisible();
}

async function assertFallbackCalls(
  recorded: HeldCase,
  onConfigChange: HeldScenario['onConfigChange'],
  effortSteps: string[][],
): Promise<void> {
  await waitFor(() =>
    expect(onConfigChange.mock.calls).toEqual([
      ...effortSteps,
      [recorded.model.configId, recorded.narrower.value],
      [recorded.effort.configId, recorded.fallback.value],
    ]),
  );
}
async function assertFallbackValue(name: string): Promise<void> {
  await waitFor(() =>
    expect(
      within(document.body).getByRole('slider', { name: 'Effort' }),
    ).toHaveAttribute(effortValue, name),
  );
}
