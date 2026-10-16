import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import {
  agentModelLabel,
  modelsScrollId,
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
    await assertShortModelList(context);
    await context.userEvent.keyboard('{Escape}');
  },
};

async function assertShortModelList({ userEvent }: PlayContext): Promise<void> {
  const overlay = within(document.body);
  await userEvent.click(
    await overlay.findByRole('button', { name: /^Model,/ }),
  );

  const scroll = await overlay.findByRole('radiogroup', { name: 'Model' });

  await waitFor(() =>
    expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight),
  );
  await userEvent.keyboard('{Escape}');
}
