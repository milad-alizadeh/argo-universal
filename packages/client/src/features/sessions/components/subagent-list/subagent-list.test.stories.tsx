import { eachLayout, settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { interleavedSubagents, subagentStates } from './subagent-list.mocks';
import listMeta from './subagent-list.stories';

const meta = {
  ...listMeta,
  title: 'Tests/Sessions/SubagentList',
  args: { ...listMeta.args, onSelect: fn() },
};

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

async function expectMetrics(
  canvas: Canvas,
  { wide, name }: { wide: boolean; name: RegExp },
  metrics: string[],
): Promise<void> {
  const row = within(canvas.getByRole(wide ? 'button' : 'link', { name }));

  for (const value of metrics)
    await expect(row.getByText(value, { exact: false })).toBeVisible();
}

export const None: Story = {
  args: { subagents: subagentStates.none },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
    }),
};

export const OneRunning: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expectMetrics(canvas, { wide, name: /Find every Feed reader/ }, [
        'Sonnet 4.5',
        '8.2k tokens',
      ]);
      await expect(canvas.queryByRole('heading', { name: 'Done' })).toBeNull();
      await expect(canvas.getByText('1')).toBeVisible();
    }),
};

export const SeveralMixed: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        canvas.getByRole('heading', { name: 'Running' }),
      ).toBeVisible();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getAllByText('2')).toHaveLength(2);
      await expect(
        canvas.getByRole('img', { name: 'Needs input' }),
      ).toBeVisible();
      await expectMetrics(canvas, { wide, name: /Draft the Plan schema/ }, [
        'Haiku 4.5',
        '12.9k tokens',
      ]);
      await expectMetrics(
        canvas,
        { wide, name: /Migrate tokens to kit roles/ },
        ['Opus 4.5', '21.4k tokens'],
      );
      await expectMetrics(canvas, { wide, name: /Port the mock CLIs/ }, [
        'Haiku 4.5',
        '1.3k tokens',
      ]);
    }),
};

export const SelectFinished: Story = {
  args: { subagents: subagentStates.severalMixed },
  play: async ({ canvas, userEvent, args }) => {
    await settleLayout('phone');
    await userEvent.click(
      canvas.getByRole('link', { name: /Port the mock CLIs/ }),
    );
    await expect(args.onSelect).toHaveBeenCalledWith(
      subagentStates.severalMixed[3],
    );
  },
};

export const AllFinished: Story = {
  args: { subagents: subagentStates.allFinished },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        canvas.queryByRole('heading', { name: 'Running' }),
      ).toBeNull();
      await expect(canvas.getByRole('heading', { name: 'Done' })).toBeVisible();
      await expect(canvas.getByText('2')).toBeVisible();
      await expectMetrics(canvas, { wide, name: /Draft the Plan schema/ }, [
        'Haiku 4.5',
        '12.9k tokens',
      ]);
      await expect(
        canvas.getByRole(wide ? 'button' : 'link', {
          name: /Port the mock CLIs/,
        }),
      ).toBeVisible();
    }),
};

// The six Agent roles each draw a mark of their own, named for assistive technology.
export const EveryRole: Story = {
  args: { subagents: subagentStates.everyRole },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      for (const role of [
        'Explore',
        'General',
        'Implement',
        'Plan',
        'Review',
        'Test',
      ])
        await expect(
          canvas.getByLabelText(new RegExp(`^${role} Agent`, 'u')),
        ).toBeVisible();
    }),
};

// Running work comes first; spawn order remains stable within each section.
export const SectionOrder: Story = {
  args: {
    subagents: interleavedSubagents,
  },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      await expect(
        canvas
          .getAllByRole(wide ? 'button' : 'link')
          .map((row) => row.getAttribute('aria-label')?.split(',')[0]),
      ).toEqual([
        'Find every Feed reader',
        'Migrate tokens to kit roles',
        'Draft the Plan schema',
        'Port the mock CLIs',
      ]);
    }),
};

export const StatusOnLeadingMark: Story = {
  args: { subagents: subagentStates.oneRunning },
  play: async ({ canvas }) =>
    eachLayout(async (wide) => {
      const row = canvas.getByRole(wide ? 'button' : 'link', {
        name: /Find every Feed reader/,
      });

      const status = canvas.getByRole('img', { name: 'Running' });
      const title = canvas.getByText('Find every Feed reader');
      await expect(row.contains(status)).toBe(true);

      const dot = status.getBoundingClientRect();

      await expect(dot.width).toBeGreaterThan(0);
      await expect(dot.right).toBeLessThan(title.getBoundingClientRect().left);
    }),
};
