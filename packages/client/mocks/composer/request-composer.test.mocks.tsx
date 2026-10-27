import { canPointAt } from '@repo/kit/mocks/point-hit';
import { shownText } from '@repo/kit/mocks/shown-text';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { newSessionCatalogs, recordedRequestMocks } from '@repo/mocks/app';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import {
  Composer,
  type ComposerProps,
} from '../../src/features/composer/components/composer/composer';
import { composerProps } from '../composer-mock';

type Story = StoryObj<typeof Composer>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);

const keptDraft = 'Keep this draft.';

const addedText = ' Add details.';

function composerControls(canvas: PlayContext['canvas']): HTMLElement[] {
  return [
    canvas.getByRole('textbox', { name: 'Message' }),
    canvas.getByRole('button', { name: 'Attach' }),
    canvas.getByRole('button', { name: 'Agent and model' }),
    canvas.getByRole('button', { name: 'Stop' }),
  ];
}

export function preservesComposer(
  agentIndex: number,
): Story & { args: ComposerProps } {
  const permission = requiredFixture(permissionMocks[agentIndex]);
  const catalog = requiredFixture(newSessionCatalogs.bothAvailable[agentIndex]);

  const onAnswer = fn();

  const request = requiredFixture(
    permission.pending.snapshot.pendingPermission,
    'Recording needs a pending Permission.',
  );

  const permissionRequest = {
    request,
    state: { kind: 'open' },
    onAnswer,
  } satisfies NonNullable<ComposerProps['permissionRequest']>;

  const allow = requiredFixture(
    permissionRequest.request.options.find((option) =>
      option.kind.startsWith('allow'),
    ),
    'Recorded Permission needs an Allow option.',
  );

  return {
    args: {
      ...composerProps({
        initialAgent: catalog.id,
        sessionStarted: true,
        running: true,
        draft: { text: keptDraft, attachments: [] },
        onDraftChange: fn(),
        onAttachImages: fn(),
        onSend: fn(),
        onStop: fn(),
      }),
      permissionRequest,
    },
    play: async ({ canvas, userEvent, args }) => {
      await settleLayout('wide');
      const message = canvas.getByRole('textbox', { name: 'Message' });
      await expect(shownText(message)).toBe(keptDraft);

      for (const control of composerControls(canvas)) {
        await expect(control).toBeVisible();
        await waitFor(() => expect(canPointAt(control)).toBe(true));
      }

      const answer = canvas.getByRole('button', { name: allow.name });

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
      await expect(onAnswer).toHaveBeenCalledWith({ optionId: allow.optionId });
      await expect(shownText(message)).toBe(keptDraft + addedText);
    },
  };
}

function requiredFixture<T>(
  value: T | null | undefined,
  message = 'Recorded catalog needs a Permission request for each Agent.',
): T {
  if (!value) throw new Error(message);

  return value;
}
