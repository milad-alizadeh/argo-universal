import { expect } from 'storybook/test';
import { readyNewSession } from '../../src/features/sessions/components/new-session-view/new-session-view.mocks';
import { eachLayout } from '../../src/lib/generic/each-layout';
import { readyArgs } from './new-session-send.test.mocks';
import type { Story } from './new-session-story.test.mocks';

// The page is usable before the saved Agents arrive; it says it is still busy until they do.
export const agentsLoading: Story = {
  args: readyArgs({
    agentsLoading: true,
    canOpen: false,
    configuration: {
      ...readyNewSession.configuration,
      agents: [],
      agent: '',
      configOptions: [],
    },
  }),
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(
        await canvas.findByRole('textbox', { name: 'Message' }),
      ).toBeVisible();
      await expect(canvas.getByTestId('new-session-composer')).toHaveAttribute(
        'aria-busy',
        'true',
      );
      await expect(
        canvas.queryByRole('button', { name: 'Agent and model' }),
      ).toBeNull();
    }),
};
