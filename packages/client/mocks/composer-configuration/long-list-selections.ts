import { expect, waitFor, within } from 'storybook/test';
import {
  modelsList,
  agentsList,
  chooseAgentLabel,
  type PlayContext,
} from './common';
import { lastLongModel, lastLongAgent } from './long-list-cases';
import { expectScrollsUnderFades } from './scroll-reachability';

export async function selectLastDesktopModel(
  context: PlayContext,
): Promise<void> {
  const overlay = within(document.body);
  await openModelChoices(context);
  const models = await overlay.findByRole('list', { name: modelsList });
  await assertModelMenuInsideWindow();
  await expectScrollsUnderFades(models, findLastModel);
  await selectLongModel(context, findLastModel);
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
  lastModel: () => Promise<HTMLElement>,
): Promise<void> {
  await clickUntil({ userEvent, row: lastModel }, () =>
    expect(args.configuration?.onConfigChange).toHaveBeenCalledWith(
      expect.any(String),
      lastLongModel.value,
    ),
  );
}

export async function selectLastAgent({
  userEvent,
  args,
}: PlayContext): Promise<void> {
  await expectScrollsUnderFades(
    await openAgentChoices(userEvent),
    findLastAgent,
  );
  await clickUntil({ userEvent, row: findLastAgent }, () =>
    expect(args.configuration?.onAgentChange).toHaveBeenCalledWith(
      lastLongAgent.agent,
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

async function openAgentChoices(
  userEvent: PlayContext['userEvent'],
): Promise<HTMLElement> {
  const overlay = within(document.body);
  await userEvent.click(
    await overlay.findByRole('button', { name: chooseAgentLabel }),
  );

  return overlay.findByRole('list', { name: agentsList });
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
  await expectScrollsUnderFades(
    await within(document.body).findByRole('list', { name: modelsList }),
    findLastModel,
  );
  await selectLongModel(context, findLastModel);
}
