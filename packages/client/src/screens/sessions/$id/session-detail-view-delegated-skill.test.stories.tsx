import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { SessionDetailView } from './session-detail-view';
import { DelegatedSkill } from './session-detail-view.stories';
import {
  skillOfferElicitation,
  type SkillDecision,
} from './skill-offer-elicitation';

const meta = {
  title: 'Tests/Screens/Sessions/Session/DelegatedSkill',
  parameters: { screenPreview: true },
  component: SessionDetailView,
} satisfies Meta<typeof SessionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Surface = 'phone' | 'wide';

type Play = Parameters<NonNullable<Story['play']>>[0];

async function requestForm(
  canvas: Play['canvas'],
  width: Surface,
): Promise<ReturnType<typeof within>> {
  if (width === 'phone')
    return within(
      await within(document.body).findByRole('dialog', {
        name: '/implement #12345',
      }),
    );

  const tray = within(await canvas.findByTestId('composer-tray'));

  return within(
    await tray.findByRole('region', { name: 'Elicitation questions' }),
  );
}

function answerSkill(
  width: Surface,
  button: string,
  decision: SkillDecision,
): Story {
  const view = DelegatedSkill.args;

  if (view?.state !== 'open') throw new Error('Expected an open Session');

  const onDecision = fn();

  return {
    beforeEach: () => settleLayout(width),
    args: {
      ...view,
      elicitation: skillOfferElicitation(
        { id: 'offer', name: 'implement', arguments: '#12345' },
        onDecision,
      ),
    },
    play: async ({ canvas, userEvent }) => {
      const form = await requestForm(canvas, width);
      const action = await form.findByRole('button', { name: button });

      await expect(onDecision).not.toHaveBeenCalled();
      await userEvent.click(action);
      await waitFor(() => expect(onDecision).toHaveBeenCalledWith(decision));
      await expect(onDecision).toHaveBeenCalledTimes(1);
    },
  };
}

export const SubmitRunsSkillFromDesktopTray = answerSkill(
  'wide',
  'Submit',
  'run',
);

export const SkipDeclinesSkillFromPhoneSheet = answerSkill(
  'phone',
  'Skip',
  'skip',
);

export const DismissDeclinesSkillFromDesktopTray = answerSkill(
  'wide',
  'Dismiss',
  'skip',
);
