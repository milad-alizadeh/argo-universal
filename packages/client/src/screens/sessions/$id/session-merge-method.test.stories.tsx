import { expect, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { checksPassed } from '../../../../mocks/session-view/session-view-merge.test.mocks';
import {
  meta as sessionDetailViewTestMeta,
  openProps,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/SessionMergeMethod',
};

export default meta;

type StoryContext = Parameters<NonNullable<Story['play']>>[0];

const mergeLabel = 'Merge PR';

const optionsLabel = 'Merge options';

const squashLabel = 'Squash and merge';

const mergeCommitLabel = 'Create a merge commit';

const rebaseLabel = 'Rebase and merge';

// The open menu ticks one method and not another.
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
  { canvas, userEvent }: Pick<StoryContext, 'canvas' | 'userEvent'>,
  name: string,
): Promise<void> {
  await settleViewport(layoutWidths.wide);
  await expect(
    await canvas.findByLabelText('Checks 5/5, passed'),
  ).toBeVisible();
  await userEvent.click(canvas.getByRole('button', { name: optionsLabel }));

  const method = await within(document.body).findByRole('menuitemradio', {
    name,
  });

  // The menu fades in.
  await waitFor(() => expect(method).toBeVisible());
  await userEvent.click(method);
}

// A method picked from the chevron's menu is the one Merge PR runs, and this device keeps it.
export const MergesByThePickedMethod: Story = {
  args: checksPassed,
  play: async (context) => {
    const { header } = openProps(context.args.view);
    await pickMethod(context, rebaseLabel);
    await expect(header.onMergeMethodChange).toHaveBeenCalledWith('rebase');
    await expect(header.onMerge).not.toHaveBeenCalled();
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: mergeLabel }),
    );
    await expect(header.onMerge).toHaveBeenCalledWith(45, 'rebase');
  },
};

// The menu ticks the method picked last.
export const TicksThePickedMethod: Story = {
  args: checksPassed,
  play: async (context) => {
    await pickMethod(context, rebaseLabel);
    await context.userEvent.click(
      context.canvas.getByRole('button', { name: optionsLabel }),
    );
    await expectTicked(rebaseLabel, squashLabel);
  },
};

const lastMethodMerge = {
  view: {
    ...checksPassed.view,
    header: { ...checksPassed.view.header, mergeMethod: 'merge' },
  },
} as const satisfies Story['args'];

// Merge PR runs the method this device used last.
export const MergesByTheLastMethod: Story = {
  args: lastMethodMerge,
  play: async ({ canvas, args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: mergeLabel }),
    );
    await expect(openProps(args.view).header.onMerge).toHaveBeenCalledWith(
      45,
      'merge',
    );
  },
};

// The menu opens with the method this device used last ticked.
export const TicksTheLastMethod: Story = {
  args: lastMethodMerge,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(
      await canvas.findByRole('button', { name: optionsLabel }),
    );
    await expectTicked(mergeCommitLabel, squashLabel);
  },
};
