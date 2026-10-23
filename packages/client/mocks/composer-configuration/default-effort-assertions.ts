import { layoutWidths } from '@repo/kit/each-layout';
import { expect, waitFor, within } from 'storybook/test';
import { type Configuration } from './common';
import type { DefaultEffortCase } from './default-effort-cases';

export interface DefaultEffortScenario {
  width: number;
  recorded: DefaultEffortCase;
}

export async function assertDefaultEffort(
  slider: HTMLElement,
  recorded: DefaultEffortCase,
  onConfigChange: Configuration['onConfigChange'],
): Promise<void> {
  const overlay = within(document.body);
  await expect(
    overlay.queryByText('No selection', { exact: true }),
  ).not.toBeInTheDocument();
  await expect(
    overlay.queryByRole('switch', { name: 'Fast mode' }),
  ).not.toBeInTheDocument();
  await assertDefaultEffortCommit(onConfigChange, recorded);
}

async function assertDefaultEffortCommit(
  onConfigChange: Configuration['onConfigChange'],
  recorded: DefaultEffortCase,
): Promise<void> {
  await waitFor(() =>
    expect(onConfigChange).toHaveBeenCalledWith(
      recorded.configId,
      recorded.selected.value,
    ),
  );
}

export async function assertCommittedDefaultEffort(
  controls: { trigger: HTMLElement; slider: HTMLElement },
  { recorded, width }: DefaultEffortScenario,
): Promise<void> {
  if (width === layoutWidths.wide)
    await expect(controls.trigger).toHaveTextContent(recorded.selected.name);
}
