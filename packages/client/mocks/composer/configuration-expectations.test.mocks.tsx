import { type SessionConfigSelectOption } from '@repo/contracts';
import { wideBreakpoint } from '@repo/kit/mocks/story-layout';
import { within, expect, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import {
  type PickerCatalog,
  agentModelLabel,
} from './composer-test-contract.test.mocks';
import { type PickerStep, configure } from './configure.test.mocks';

export async function expectHighEffort({
  canvas,
  userEvent,
  width,
  catalog,
}: PickerStep & { catalog: PickerCatalog }): Promise<void> {
  const overlay = within(document.body);
  const picker = configure({ canvas, userEvent }, width);
  const model = catalog.highEffortModel;
  await picker.chooseModel(model.name);
  const slider = await overlay.findByRole('slider', { name: 'Effort' });
  await picker.chooseEffort(catalog.highEffortLevels, catalog.highEffort);
  await expect(slider).toHaveValue(
    String(catalog.highEffortLevels.indexOf(catalog.highEffort)),
  );
  await browserUserEvent.keyboard('{ArrowRight}');
  await picker.expectChip(
    expectedModelLabel(model.name),
    catalog.highEffortLevels[await picker.effort()],
  );
  await expect(slider).not.toHaveValue(
    String(catalog.highEffortLevels.indexOf(catalog.highEffort)),
  );
}

export async function expectEffortFollowsModel({
  canvas,
  userEvent,
  width,
  model,
}: PickerStep & { model: SessionConfigSelectOption }): Promise<void> {
  const overlay = within(document.body);
  await configure({ canvas, userEvent }, width).chooseModel(model.name);

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
  const wide = width >= wideBreakpoint();
  const role = wide ? 'menuitemradio' : 'radio';
  await userEvent.click(await canvas.findByRole('button', { name: 'Mode' }));

  const planMode = await overlay.findByRole(role, {
    name: new RegExp('^' + planning.name),
  });

  await waitFor(() => expect(planMode).toBeVisible());
  await expect(
    overlay.getByRole(role, { name: new RegExp('^' + dangerous.name) }),
  ).toHaveAttribute('aria-checked', 'false');

  await userEvent.click(
    overlay.getByRole(role, { name: new RegExp('^' + dangerous.name) }),
  );
  await waitFor(() =>
    expect(
      overlay.queryByRole(wide ? 'menu' : 'dialog', { name: 'Mode' }),
    ).not.toBeInTheDocument(),
  );

  if (wide)
    await expect(
      canvas.getByRole('button', { name: 'Mode' }),
    ).toHaveTextContent(dangerous.name);
  await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
  await expect(
    await overlay.findByRole(role, {
      name: new RegExp('^' + dangerous.name),
    }),
  ).toHaveAttribute('aria-checked', 'true');
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
