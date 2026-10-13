import { expect, waitFor, within } from 'storybook/test';
import {
  modelsScrollId,
  agentsScrollId,
  chooseAgentLabel,
  type PlayContext,
} from './common';
import { lastLongModel, lastLongAgent } from './long-list-cases';
import { expectScrollsUnderFades, lastVisible } from './scroll-reachability';
export async function selectLastDesktopModel(
  context: PlayContext,
): Promise<void> {
  const overlay = within(document.body);
  await openModelChoices(context);
  const models = await overlay.findByTestId(modelsScrollId);
  await assertModelMenuInsideWindow();
  const lastModel = await expectScrollsUnderFades(models, findLastModel);
  await selectLongModel(context, lastModel);
}
function findLastModel(): Promise<HTMLElement> {
  return within(document.body).findByRole('button', {
    name: lastLongModel.name,
  });
}
async function openModelChoices({ userEvent }: PlayContext): Promise<void> {
  await userEvent.click(
    await within(document.body).findByRole('button', { name: /^Model,/ }),
  );
}
async function assertModelMenuInsideWindow(): Promise<void> {
  const overlay = within(document.body);
  await expect(
    overlay
      .getByRole('dialog', { name: 'Select Model' })
      .getBoundingClientRect().bottom,
  ).toBeLessThanOrEqual(window.innerHeight);
  await waitFor(() =>
    expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible(),
  );
}
async function selectLongModel(
  { userEvent, args }: PlayContext,
  lastModel: HTMLElement,
): Promise<void> {
  await userEvent.click(lastModel);
  await expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
    expect.any(String),
    lastLongModel.value,
  );
}
export async function selectLastAgent({
  userEvent,
  args,
}: PlayContext): Promise<void> {
  const overlay = within(document.body);
  await userEvent.click(
    await overlay.findByRole('button', { name: chooseAgentLabel }),
  );
  const agents = await overlay.findByTestId(agentsScrollId);
  const lastAgent = await expectScrollsUnderFades(agents, findLastAgent);
  await userEvent.click(lastAgent);
  await expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
    lastLongAgent.agent,
  );
}
function findLastAgent(): Promise<HTMLElement> {
  return within(document.body).findByRole('button', {
    name: `Select ${lastLongAgent.label}`,
  });
}
export async function selectLastPhoneModel(
  context: PlayContext,
): Promise<void> {
  await openModelChoices(context);
  await selectLongModel(context, await lastVisible(lastLongModel.name));
}
