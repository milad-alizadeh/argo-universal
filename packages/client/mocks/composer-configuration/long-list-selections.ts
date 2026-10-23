import { expect, waitFor, within } from 'storybook/test';
import type { PlayContext } from './common';
import { lastLongModel } from './long-list-cases';
import { lastVisible, expectRowInsideScroll } from './scroll-reachability';

export async function selectLastDesktopModel(
  context: PlayContext,
): Promise<void> {
  await openModelChoices(context);

  const models = await within(document.body).findByRole('radiogroup', {
    name: 'Model',
  });

  await assertModelMenuInsideWindow();
  await assertLastModelReachable(models);
  await selectLongModel(context, findLastModel);
}

async function assertLastModelReachable(models: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(models.scrollHeight).toBeGreaterThan(models.clientHeight),
  );
  models.scrollTop = models.scrollHeight;
  await waitFor(async () =>
    expectRowInsideScroll(models, await findLastModel()),
  );
}

function findLastModel(): Promise<HTMLElement> {
  return within(document.body).findByRole('radio', {
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
    overlay.getByRole('dialog', { name: 'Model' }).getBoundingClientRect()
      .bottom,
  ).toBeLessThanOrEqual(window.innerHeight);
  await waitFor(() =>
    expect(overlay.getByRole('slider', { name: 'Effort' })).toBeVisible(),
  );
}

async function selectLongModel(
  { userEvent, args }: PlayContext,
  lastModel: () => Promise<HTMLElement>,
): Promise<void> {
  await clickUntil({ userEvent, row: lastModel }, () =>
    expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
      expect.any(String),
      lastLongModel.value,
    ),
  );
}

// Clicks the row found fresh each try, as a virtualized list can swap the node under a click.
async function clickUntil(
  {
    userEvent,
    row,
  }: Pick<PlayContext, 'userEvent'> & { row: () => Promise<HTMLElement> },
  called: () => Promise<void>,
): Promise<void> {
  await waitFor(async () => {
    await userEvent.click(await row());
    await called();
  });
}

export async function selectLastPhoneModel(
  context: PlayContext,
): Promise<void> {
  await openModelChoices(context);
  await selectLongModel(context, () => lastVisible(lastLongModel.name));
}
