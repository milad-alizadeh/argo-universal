import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, within } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { SessionRow } from './session-row';

const meta = {
  ...sessionRowTestMeta,
  title: 'Tests/Sessions/SessionRow/ChangeModifiers',
};

export default meta;

function modifiers(width: number, layout: 'regular' | 'compact'): Story {
  return {
    args: { layout },
    render: (args) => (
      <>
        <SessionRow
          {...args}
          session={{ ...args.session, title: 'Draft Change' }}
          pullRequest={{ stage: 'open', number: 45, modifier: 'draft' }}
        />
        <SessionRow
          {...args}
          session={{ ...args.session, title: 'Conflict Change' }}
          pullRequest={{ stage: 'open', number: 46, modifier: 'conflict' }}
        />
      </>
    ),
    play: async ({ canvas }) => {
      await settleLayout(width);

      const rowOf = (label: string): ReturnType<typeof within> =>
        within(
          canvas.getByRole('button', {
            name: new RegExp(`^${label} Change, Running`),
          }),
        );

      // A draft has a mark of its own, so nothing is written beside it.
      const draft = rowOf('Draft');

      await expect(draft.getByTestId('icon-pr-draft')).toBeVisible();
      await expect(draft.queryByTestId('icon-pr-open')).not.toBeInTheDocument();
      await expect(
        draft.queryByText('Draft', { exact: true }),
      ).not.toBeInTheDocument();

      // So does a conflict: its own mark in place of Open's, and no word beside it.
      const conflict = rowOf('Conflict');

      await expect(conflict.getByTestId('icon-pr-conflict')).toBeVisible();
      await expect(
        conflict.queryByTestId('icon-pr-open'),
      ).not.toBeInTheDocument();
      await expect(
        conflict.queryByText('Conflict', { exact: true }),
      ).not.toBeInTheDocument();
    },
  };
}

export const CompactPhone = modifiers(layoutWidths.phone, 'compact');

export const CompactWide = modifiers(layoutWidths.wide, 'compact');

export const RegularPhone = modifiers(layoutWidths.phone, 'regular');

export const RegularWide = modifiers(layoutWidths.wide, 'regular');
