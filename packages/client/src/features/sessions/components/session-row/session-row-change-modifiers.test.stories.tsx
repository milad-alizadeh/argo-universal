import { expect, within } from 'storybook/test';
import {
  meta as sessionRowTestMeta,
  type Story,
} from '../../../../../mocks/session-row/session-row-story.test.mocks';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { SessionRow } from './session-row';

const meta = {
  ...sessionRowTestMeta,
  title: 'Tests/SessionRow Change modifiers',
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
      await settleViewport(width);

      for (const label of ['Draft', 'Conflict']) {
        const row = within(
          canvas.getByRole('button', {
            name: new RegExp(`^${label} Change, Running`),
          }),
        );

        await expect(row.getByText(label, { exact: true })).toBeVisible();
        await expect(row.getByTestId('icon-pr-open')).toBeVisible();
        await expect(
          row.queryByTestId('icon-pr-draft'),
        ).not.toBeInTheDocument();
        await expect(
          row.queryByTestId('icon-pr-conflict'),
        ).not.toBeInTheDocument();
      }
    },
  };
}

export const CompactPhone = modifiers(layoutWidths.phone, 'compact');

export const CompactWide = modifiers(layoutWidths.wide, 'compact');

export const RegularPhone = modifiers(layoutWidths.phone, 'regular');

export const RegularWide = modifiers(layoutWidths.wide, 'regular');
