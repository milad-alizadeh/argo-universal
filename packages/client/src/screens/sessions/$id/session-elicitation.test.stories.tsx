import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  elicitationMocks,
  elicitationProps,
  questionsRequest,
  questionsValues,
} from '../../../../mocks/elicitation';
import { questionPlan } from '../../../../mocks/elicitation-questions';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { idleSession, runningSession } from './session-detail-view.mocks';
import { Elicitation } from './session-detail-view.stories';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Elicitation',
  parameters: { screenPreview: true },
  component: SessionDetailView,
  render: Elicitation.render,
} satisfies Meta<typeof SessionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

type Agent = (typeof elicitationMocks)[number]['agent'];

export const ClaudeKeepsComposer: Story = anchoredSession('agent-1');

export const CodexKeepsComposer: Story = anchoredSession('agent-2');

function anchoredSession(agent: Agent): Story {
  const onAnswer = fn();

  return {
    args: pendingSession(agent, onAnswer),
    beforeEach: async (): Promise<void> => {
      await settleViewport(1440);
    },
    play: async (context) => {
      await resizeAndDismiss(context);
      await expect(onAnswer).toHaveBeenCalledOnce();
      await expect(onAnswer).toHaveBeenCalledWith({ action: 'cancel' });
    },
  };
}

function pendingSession(
  agent: Agent,
  onAnswer: ReturnType<typeof fn>,
): SessionDetailViewProps {
  const mock = elicitationMocks.find((recording) => recording.agent === agent);

  if (!mock) throw new Error(`Recorded Elicitation needs ${agent}`);
  const session = agent === 'agent-1' ? runningSession : idleSession;

  return {
    state: 'open',
    ...session,
    header: { ...session.header, status: 'needs_input' },
    composer: {
      ...session.composer,
      status: { ...session.composer.status, plan: questionPlan },
    },
    elicitation: elicitationProps({
      mock,
      request: questionsRequest,
      values: questionsValues,
      onAnswer,
    }),
  };
}

async function resizeAndDismiss({
  canvas,
  userEvent,
}: PlayContext): Promise<void> {
  await expect(
    canvas.queryByRole('button', { name: /^Plan/ }),
  ).not.toBeInTheDocument();
  const page = within(document.body);

  const sheet = within(
    await page.findByRole('region', { name: 'Elicitation questions' }),
  );

  const title = await resizeAnswer(sheet, userEvent);
  await waitFor(() =>
    assertInputInSession(title, canvas.getByTestId('session-layout')),
  );
  await userEvent.click(sheet.getByRole('button', { name: 'Dismiss' }));
  await expect(
    await canvas.findByRole('textbox', { name: 'Message' }),
  ).toBeVisible();
  await expect(canvas.getByRole('button', { name: /^Plan/ })).toBeVisible();
}

async function resizeAnswer(
  sheet: ReturnType<typeof within>,
  userEvent: PlayContext['userEvent'],
): Promise<HTMLElement> {
  const title = sheet.getByRole('textbox', { name: 'Custom answer' });
  await userEvent.clear(title);
  await userEvent.type(title, 'Keep this answer while resizing');
  await settleViewport(1120);
  await expect(title).toHaveValue('Keep this answer while resizing');

  return title;
}

async function assertInputInSession(
  input: HTMLElement,
  session: HTMLElement,
): Promise<void> {
  const field = input.getBoundingClientRect();
  const pane = session.getBoundingClientRect();
  await expect(field.left).toBeGreaterThanOrEqual(pane.left);
  await expect(field.right).toBeLessThanOrEqual(pane.right);
}
