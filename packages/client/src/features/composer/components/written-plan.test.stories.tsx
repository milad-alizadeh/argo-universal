import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type ReactElement, useState } from 'react';
import { expect, fn, spyOn, waitFor, within } from 'storybook/test';
import { recordedAcpContent } from '../../../mocks/acp-feed-content';
import { composerProps } from '../../../mocks/composer-mock';
import type { MockAgent } from '../../../mocks/feed-message-mock';
import { longWrittenPlan } from '../../../mocks/feed-paper';
import { layoutWidths } from '../../../storybook/each-layout';
import { settleViewport } from '../../../storybook/settle-viewport';
import { Composer } from './composer';

const writtenPlanRegionName = 'Written plan content';

const meta = {
  title: 'Tests/WrittenPlan',
  component: Composer,
  render: function EditableComposer(args): ReactElement {
    const [draft, setDraft] = useState(args.draft);
    return (
      <Composer
        {...args}
        draft={draft}
        onDraftChange={(next) => {
          setDraft(next);
          args.onDraftChange(next);
        }}
      />
    );
  },
  args: {
    draft: { text: '', images: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onSend: fn(),
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof Composer>;

function opensWrittenPlan(
  width: number,
  agent: MockAgent,
  form: 'markdown' | 'file',
): Story {
  const row = recordedAcpContent(agent).rows.find(
    (row) => row.sessionUpdate === 'plan_update' && row.plan.type === form,
  );
  if (row?.sessionUpdate !== 'plan_update' || row.plan.type === 'items')
    throw new Error(`Recording needs ${form} Plan for ${agent}`);
  return {
    args: {
      ...composerProps({ ...meta.args, initialAgent: agent }),
      writtenPlan: row.plan,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Written plan' }),
      );
      const body = within(document.body);
      if (form === 'markdown')
        await waitFor(() =>
          expect(
            within(
              body.getByRole('region', { name: writtenPlanRegionName }),
            ).getByRole('heading', { name: 'Read-only Plan', level: 1 }),
          ).toBeVisible(),
        );
      else {
        await expect(
          body.getByLabelText('file:///project/plan.md'),
        ).toBeVisible();
        await expect(
          body.getByText('The Agent shared where the plan is, not its text.'),
        ).toBeVisible();
        const clipboard = spyOn(
          navigator.clipboard,
          'writeText',
        ).mockResolvedValue();
        try {
          await userEvent.click(body.getByRole('button', { name: 'Copy URI' }));
          await waitFor(() =>
            expect(clipboard).toHaveBeenCalledWith('file:///project/plan.md'),
          );
        } finally {
          clipboard.mockRestore();
        }
      }
      await expect(
        body.queryByRole('button', { name: 'Approve' }),
      ).not.toBeInTheDocument();
      await expect(
        body.queryByRole('button', { name: 'Keep planning' }),
      ).not.toBeInTheDocument();
      if (width === layoutWidths.wide) {
        await userEvent.type(
          canvas.getByRole('textbox'),
          'Follow up on this plan.',
        );
        await expect(canvas.getByRole('textbox')).toHaveValue(
          'Follow up on this plan.',
        );
        await expect(
          body.getByRole('region', { name: writtenPlanRegionName }),
        ).toBeVisible();
      }
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          body.queryByRole('region', { name: writtenPlanRegionName }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}
export const MarkdownFirstAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-1',
  'markdown',
);
export const MarkdownFirstAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-1',
  'markdown',
);
export const MarkdownSecondAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-2',
  'markdown',
);
export const MarkdownSecondAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-2',
  'markdown',
);
export const FileFirstAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-1',
  'file',
);
export const FileFirstAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-1',
  'file',
);
export const FileSecondAgentPhone = opensWrittenPlan(
  layoutWidths.phone,
  'agent-2',
  'file',
);
export const FileSecondAgentWide = opensWrittenPlan(
  layoutWidths.wide,
  'agent-2',
  'file',
);

function readsLongWrittenPlan(width: number, agent: MockAgent): Story {
  return {
    args: {
      ...composerProps({ ...meta.args, initialAgent: agent }),
      writtenPlan: longWrittenPlan,
    },
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Written plan' }),
      );
      const body = within(document.body);
      const content = body.getByRole('region', {
        name: writtenPlanRegionName,
      });
      const end = within(content).getByText('End of the written plan.');
      let scroll: HTMLElement | null =
        width === layoutWidths.wide
          ? body.getByLabelText('Written plan document')
          : content.parentElement;
      while (scroll && scroll.scrollHeight <= scroll.clientHeight)
        scroll = scroll.parentElement;
      if (!scroll)
        throw new Error('Long written Plan needs a scrollable document');
      const documentScroll = scroll;
      documentScroll.scrollTop = documentScroll.scrollHeight;
      await waitFor(() => expect(documentScroll.scrollTop).toBeGreaterThan(0));
      await expect(end.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        documentScroll.getBoundingClientRect().bottom,
      );
      await expect(end.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        documentScroll.getBoundingClientRect().top,
      );
      if (width === layoutWidths.wide) {
        const composer = canvas.getByRole('textbox');
        await expect(composer).toBeVisible();
        await expect(
          composer.getBoundingClientRect().bottom,
        ).toBeLessThanOrEqual(window.innerHeight);
        await userEvent.type(composer, 'Keep the last step.');
        await expect(composer).toHaveValue('Keep the last step.');
      }
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(
          body.queryByRole('region', { name: writtenPlanRegionName }),
        ).not.toBeInTheDocument(),
      );
    },
  };
}
export const LongFirstAgentPhone = readsLongWrittenPlan(
  layoutWidths.phone,
  'agent-1',
);
export const LongFirstAgentWide = readsLongWrittenPlan(
  layoutWidths.wide,
  'agent-1',
);
export const LongSecondAgentPhone = readsLongWrittenPlan(
  layoutWidths.phone,
  'agent-2',
);
export const LongSecondAgentWide = readsLongWrittenPlan(
  layoutWidths.wide,
  'agent-2',
);
