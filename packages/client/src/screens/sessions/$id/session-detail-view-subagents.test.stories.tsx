import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import {
  meta as sessionDetailViewTestMeta,
  type Story,
} from '../../../../mocks/session-view/session-view-story.test.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import { runningSession } from './session-detail-view.mocks';

const meta = {
  ...sessionDetailViewTestMeta,
  title: 'Tests/SessionDetailViewSubagents',
};

export default meta;

export const ComposerSubagentsOpenSheet: Story = {
  args: {
    view: {
      state: 'open',
      ...runningSession,
      subagents: {
        subagents: subagentStates.severalMixed,
        onSelect: fn(),
        now: subagentNow,
      },
    },
  },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Subagents: 5' }),
    );
    const page = within(document.body);

    await expect(await page.findByText('Find every Feed reader')).toBeVisible();
    await expect(page.getByText('Migrate tokens to kit roles')).toBeVisible();
    await expect(page.getByText('Draft the Plan schema')).toBeVisible();
  },
};
