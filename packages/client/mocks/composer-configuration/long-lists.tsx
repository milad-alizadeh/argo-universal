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
  selectLastAgent,
} from './long-list-selections';
export const LongListsScrollUnderFadesWide: Story = {
  args: { configuration: longListConfiguration() },
  render: renderArgs,
  play: async (context) => {
    await openConfiguration(context, layoutWidths.wide);
    await selectLastDesktopModel(context);
    await selectLastAgent(context);
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
    await selectLastAgent(context);
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
    for (const testId of [modelsScrollId, agentsScrollId])
      await assertShortList(context, testId);
    await context.userEvent.keyboard('{Escape}');
  },
};
async function assertShortList(
  { userEvent }: PlayContext,
  testId: string,
): Promise<void> {
  const overlay = within(document.body);
  await userEvent.click(await shortListTrigger(testId));
  const scroll = await overlay.findByTestId(testId);
  await waitFor(() =>
    expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight),
  );
  await expect(fadedEdges(scroll)).toEqual({ top: false, bottom: false });
  await userEvent.keyboard('{Escape}');
}

function shortListTrigger(testId: string): Promise<HTMLElement> {
  return within(document.body).findByRole('button', {
    name: testId === modelsScrollId ? /^Model,/ : chooseAgentLabel,
  });
}
