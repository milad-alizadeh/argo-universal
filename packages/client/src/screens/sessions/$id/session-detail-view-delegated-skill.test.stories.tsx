import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { SessionDetailView } from './session-detail-view';
import { DelegatedSkill } from './session-detail-view.stories';

const meta = {
  title: 'Tests/Screens/Sessions/Session/DelegatedSkill',
  parameters: { screenPreview: true },
  component: SessionDetailView,
} satisfies Meta<typeof SessionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

function answerSkill(button: string, decision: 'run' | 'skip'): Story {
  const view = DelegatedSkill.args;

  if (view?.state !== 'open') throw new Error('Expected an open Session');

  const onAnswer = fn();

  return {
    beforeEach: () => settleLayout('wide'),
    args: {
      ...view,
      feed: {
        ...view.feed,
        items: view.feed.items.map((item) =>
          item.type === 'delegated' && item.kind === 'offered_skill'
            ? { ...item, onAnswer }
            : item,
        ),
      },
    },
    play: async ({ canvas, userEvent }) => {
      const action = await canvas.findByRole('button', { name: button });
      await expect(onAnswer).not.toHaveBeenCalled();
      await userEvent.click(action);
      await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(decision));
      await expect(onAnswer).toHaveBeenCalledTimes(1);
    },
  };
}

export const SubmitRunsSkill = answerSkill('Submit', 'run');

export const SkipDeclinesSkill = answerSkill('Skip', 'skip');

export const DismissDeclinesSkill = answerSkill('Dismiss', 'skip');
