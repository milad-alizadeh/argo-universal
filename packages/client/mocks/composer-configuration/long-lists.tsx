import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor, within } from 'storybook/test';
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
  await settleLayout(width);
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

export const ShortModelListFitsWide: Story = {
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
  // The list must fit once the popover has opened, not only while it zooms in.
  await settleOverlays();

  await waitFor(() =>
    expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight),
  );
  await userEvent.keyboard('{Escape}');
}
