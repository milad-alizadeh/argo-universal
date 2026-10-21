import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { ControlledMergeButton } from './merge-pr-button.test.mocks';

// Spec 0020 removed Merge from the Session header. Its public control still owns method selection and execution.
const meta = {
  title: 'Tests/Sessions/MergePrButton',
  component: ControlledMergeButton,
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  args: {
    mergeable: true,
    method: 'squash',
    onMethodChange: fn(),
    onMerge: fn(),
  },
} satisfies Meta<typeof ControlledMergeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story['play']>>[0];

const mergeLabel = 'Merge';

const optionsLabel = 'Merge options';

const squashLabel = 'Squash and merge';

const mergeCommitLabel = 'Create a merge commit';

const rebaseLabel = 'Rebase and merge';

async function expectTicked(ticked: string, unticked: string): Promise<void> {
  const menu = within(document.body);
  await expect(
    await menu.findByRole('menuitemradio', { name: ticked }),
  ).toHaveAttribute('aria-checked', 'true');
  await expect(
    menu.getByRole('menuitemradio', { name: unticked }),
  ).toHaveAttribute('aria-checked', 'false');
}

async function pickMethod(
  { canvas, userEvent }: Context,
  name: string,
): Promise<void> {
  await userEvent.click(canvas.getByRole('button', { name: optionsLabel }));

  const method = await within(document.body).findByRole('menuitemradio', {
    name,
  });

  await waitFor(() => expect(method).toBeVisible());
  await userEvent.click(method);
}

export const MergesByThePickedMethod: Story = {
  play: async (context) => {
    await pickMethod(context, rebaseLabel);
    await expect(context.args.onMethodChange).toHaveBeenCalledWith('rebase');
    await expect(context.args.onMerge).not.toHaveBeenCalled();
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: mergeLabel }),
    );
    await expect(context.args.onMerge).toHaveBeenCalledWith('rebase');
  },
};

export const TicksThePickedMethod: Story = {
  play: async (context) => {
    await pickMethod(context, rebaseLabel);
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: optionsLabel }),
    );
    await expectTicked(rebaseLabel, squashLabel);
  },
};

export const MergesByTheLastMethod: Story = {
  args: { method: 'merge' },
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: mergeLabel }));
    await expect(args.onMerge).toHaveBeenCalledWith('merge');
  },
};

export const TicksTheLastMethod: Story = {
  args: { method: 'merge' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: optionsLabel }));
    await expectTicked(mergeCommitLabel, squashLabel);
  },
};

export const MergeWaitsForChecks: Story = {
  args: { mergeable: false },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: mergeLabel }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: optionsLabel }),
    ).toBeDisabled();
  },
};

export const MergesWhenChecksPass: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.getByRole('button', { name: mergeLabel }),
    ).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: mergeLabel }));
    await expect(args.onMerge).toHaveBeenCalledWith('squash');
  },
};

export const UnavailableMergeStaysDisabled: Story = {
  args: { onMerge: undefined },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: mergeLabel }),
    ).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: optionsLabel }),
    ).toBeDisabled();
  },
};
