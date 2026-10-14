import { newSessionCatalogs, recordedRequestMocks } from '@repo/mocks/app';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import {
  Composer,
  type ComposerProps,
} from '../../src/features/composer/components/composer/composer';
import { layoutWidths } from '../../src/lib/generic/each-layout';
import { settleViewport } from '../../src/lib/generic/settle-viewport';
import { composerProps } from '../composer-mock';
import { planProposalMocks } from '../plan-proposal-mock';
import { canPointAt } from '../point-hit';
import { shownText } from '../shown-text';

type Story = StoryObj<typeof Composer>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);

export const keptDraft = 'Keep this draft.';

const addedText = ' Add details.';

export function composerControls(canvas: PlayContext['canvas']): HTMLElement[] {
  return [
    canvas.getByRole('textbox', { name: 'Message' }),
    canvas.getByRole('button', { name: 'Attach' }),
    canvas.getByRole('button', { name: 'Agent and model' }),
    canvas.getByRole('button', { name: 'Stop' }),
  ];
}

export function preservesComposer(
  agentIndex: number,
  requestKind: 'plan' | 'permission',
): Story & { args: ComposerProps } {
  const permission = requiredFixture(permissionMocks[agentIndex]);
  const catalog = requiredFixture(newSessionCatalogs.bothAvailable[agentIndex]);

  const plan = requiredFixture(
    planProposalMocks.find((mock) => mock.agent === permission.agent),
  );

  const onAnswer = fn();

  const request = requiredFixture(
    permission.pending.snapshot.pendingPermission,
    'Recording needs a pending Permission.',
  );

  const permissionRequest = {
    request,
    state: { kind: 'open' },
    onAnswer,
    onDenialMessageChange: fn(),
  } satisfies NonNullable<ComposerProps['permissionRequest']>;

  const allow = requiredFixture(
    permissionRequest.request.options.find((option) =>
      option.kind.startsWith('allow'),
    ),
    'Recorded Permission needs an Allow option.',
  );

  const expectedAnswer =
    requestKind === 'plan'
      ? { planId: plan.proposal.planId, decision: 'approve' }
      : { optionId: allow.optionId };

  return {
    args: {
      ...composerProps({
        initialAgent: catalog.agent,
        sessionStarted: true,
        running: true,
        draft: { text: keptDraft, attachments: [] },
        onDraftChange: fn(),
        onAttachImages: fn(),
        onSend: fn(),
        onStop: fn(),
      }),
      ...(requestKind === 'plan'
        ? {
            planProposal: {
              proposal: plan.proposal,
              state: { kind: 'open' },
              onAnswer,
            },
          }
        : { permissionRequest }),
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleViewport(layoutWidths.wide);
      const message = canvas.getByRole('textbox', { name: 'Message' });
      await expect(shownText(message)).toBe(keptDraft);

      for (const control of composerControls(canvas)) {
        await expect(control).toBeVisible();
        await waitFor(() => expect(canPointAt(control)).toBe(true));
      }

      const answer = canvas.getByRole('button', {
        name: requestKind === 'plan' ? 'Approve' : allow.name,
      });

      await browserUserEvent.click(message);
      await browserUserEvent.keyboard('{End}');
      await browserUserEvent.type(message, addedText);
      await expect(shownText(message)).toBe(keptDraft + addedText);
      await browserUserEvent.keyboard('{Enter}');
      await expect(onAnswer).not.toHaveBeenCalled();
      await expect(args.onSend).not.toHaveBeenCalled();
      await waitFor(() => expect(canPointAt(answer)).toBe(true));
      await userEvent.click(answer);
      await expect(onAnswer).toHaveBeenCalledTimes(1);
      await expect(onAnswer).toHaveBeenCalledWith(expectedAnswer);
      await expect(shownText(message)).toBe(keptDraft + addedText);
    },
  };
}

function requiredFixture<T>(
  value: T | null | undefined,
  message = 'Recorded catalog needs both request kinds for each Agent.',
): T {
  if (!value) throw new Error(message);

  return value;
}
