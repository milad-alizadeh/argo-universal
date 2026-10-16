import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { fadedEdges } from '../scroll-fade';
import {
  agentModelLabel,
  modelsScrollId,
  agentsScrollId,
  chooseAgentLabel,
  renderArgs,
  type Story,
  type PlayContext,
} from './common';
import { longListConfiguration, shortConfiguration } from './long-list-cases';
import {
  selectLastDesktopModel,
  selectLastPhoneModel,
} from './long-list-selections';

export const LongListsReachableWide: Story = {
  args: { configuration: longListConfiguration() },
  render: renderArgs,
  play: async (context) => {
    await openConfiguration(context, layoutWidths.wide);
    await selectLastDesktopModel(context);
    await context.userEvent.keyboard('{Escape}');
  },
};

async function openConfiguration(
  { canvas, userEvent }: PlayContext,
  width: number,
): Promise<void> {
  await settleViewport(width);
  await userEvent.click(canvas.getByRole('button', { name: agentModelLabel }));
}

export const LongListsReachableInPhoneSheet: Story = {
  args: { configuration: longListConfiguration() },
  render: renderArgs,
  play: async (context) => {
    await openConfiguration(context, layoutWidths.phone);
    await selectLastPhoneModel(context);
    await expect(
      within(document.body).queryByTestId(modelsScrollId),
    ).not.toBeInTheDocument();
    await context.userEvent.keyboard('{Escape}');
  },
};

export const ShortListsHaveNoFadesWide: Story = {
  args: { configuration: shortConfiguration },
  play: async (context) => {
    await openConfiguration(context, layoutWidths.wide);

    for (const testId of [modelsScrollId])
      await assertShortList(context, testId);
    await context.userEvent.keyboard('{Escape}');
  },
};

async function assertShortList(
  { userEvent }: PlayContext,
  testId: string,
): Promise<void> {
  await userEvent.click(await shortListTrigger(testId));

  const scroll = await configurationScroll(testId);

  await waitFor(() =>
    expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight),
  );

  if (testId === agentsScrollId)
    await expect(fadedEdges(scroll)).toEqual({ top: false, bottom: false });
  await userEvent.keyboard('{Escape}');
}

function shortListTrigger(testId: string): Promise<HTMLElement> {
  return within(document.body).findByRole('button', {
    name: testId === modelsScrollId ? /^Model,/ : chooseAgentLabel,
  });
}

function configurationScroll(testId: string): Promise<HTMLElement> {
  const overlay = within(document.body);

  return testId === modelsScrollId
    ? overlay.findByRole('radiogroup', { name: 'Model' })
    : overlay.findByTestId(testId);
}
