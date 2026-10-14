import { type SessionConfigSelectOption } from '@repo/contracts';
import { within, expect, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { wideBreakpoint } from '../../src/lib/generic/each-layout';
import { chooseEffort } from '../choose-effort';
import {
  type PickerCatalog,
  valueTextAttribute,
  agentModelLabel,
  pressedAttribute,
} from './composer-test-contract.test.mocks';
import { type PickerStep, chooseModel } from './model-choice.test.mocks';

export async function expectHighEffort({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const model = catalog.highEffortModel;
  await chooseModel({ userEvent, width, name: model.name });
  const slider = await overlay.findByRole('slider', { name: 'Effort' });
  await chooseEffort(slider, catalog.highEffortLevels, catalog.highEffort);
  await expect(slider).toHaveAttribute(valueTextAttribute, catalog.highEffort);
  await browserUserEvent.keyboard('{ArrowRight}');
  await expect(
    canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
  ).toHaveTextContent(
    width >= wideBreakpoint()
      ? (slider.getAttribute(valueTextAttribute) ?? '')
      : expectedModelLabel(model.name),
  );
  await expect(slider).not.toHaveAttribute(
    valueTextAttribute,
    catalog.highEffort,
  );
}

export async function expectEffortFollowsModel({
  canvas,
  userEvent,
  width,
  model,
}: PickerStep & { model: SessionConfigSelectOption }): Promise<void> {
  const overlay = within(document.body);
  await chooseModel({ userEvent, width, name: model.name });

  if (modelSupportsEffort(model))
    await expect(
      await overlay.findByRole('slider', { name: 'Effort' }),
    ).toBeVisible();
  else {
    await expect(
      overlay.queryByRole('slider', { name: 'Effort' }),
    ).not.toBeInTheDocument();
    await expect(
      within(
        canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
      ).getByText(expectedModelLabel(model.name)),
    ).toBeInTheDocument();
  }
}

export async function expectDangerousMode({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const { planning, dangerous } = catalog;
  await userEvent.click(await canvas.findByRole('button', { name: 'Mode' }));
  const planMode = await overlay.findByRole('button', { name: planning.name });
  await waitFor(() => expect(planMode).toBeVisible());
  await expect(
    overlay.getByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'false');
  await userEvent.click(overlay.getByRole('button', { name: dangerous.name }));
  await waitFor(() =>
    expect(overlay.queryByRole('dialog')).not.toBeInTheDocument(),
  );

  if (width >= wideBreakpoint())
    await expect(
      canvas.getByRole('button', { name: 'Mode' }),
    ).toHaveTextContent(dangerous.name);
  await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
  await expect(
    await overlay.findByRole('button', { name: dangerous.name }),
  ).toHaveAttribute(pressedAttribute, 'true');
  await userEvent.keyboard('{Escape}');
}

const recordedModelLabels = new Map([
  ['Opus 5.5 (recommended)', 'Opus 5.5'],
  ['Haiku 4.5', 'Haiku 4.5'],
  ['Opus 4.6', 'Opus 4.6'],
  ['GPT-6-Astra', 'GPT-6-Astra'],
  ['GPT-6-Luna', 'GPT-6-Luna'],
  ['GPT-5.5', 'GPT-5.5'],
]);

function expectedModelLabel(name: string): string {
  const label = recordedModelLabels.get(name);

  if (!label)
    throw new Error(`Recorded model needs an expected label: ${name}`);

  return label;
}

function modelSupportsEffort(model: SessionConfigSelectOption): boolean {
  return Boolean(model._meta?.argo?.supportsEffort);
}
