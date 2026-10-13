import { newSessionCatalogs, recordedRequestMocks } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { SessionLayout } from '#lib/product/session-layout';
import { composerProps } from '../../../../../mocks/composer-mock';
import { planProposalMocks } from '../../../../../mocks/plan-proposal-mock';
import { canPointAt } from '../../../../../mocks/point-hit';
import { shownText } from '../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { Composer, type ComposerProps } from './composer';

const permissionMocks = recordedRequestMocks.filter(
  (mock) => mock.recording === 'permission',
);
const keptDraft = 'Keep this draft.';
const addedText = ' Add details.';
const meta = {
  title: 'Tests/Composer/Requests',
  component: Composer,
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <SessionLayout
        header={<View />}
        feed={<View className="flex-1" />}
        composer={<Story />}
      />
    ),
  ],
  render: function EditableComposer(args): React.JSX.Element {
    const [draft, setDraft] = useState(args.draft);
    return <Composer {...args} draft={draft} onDraftChange={setDraft} />;
  },
} satisfies Meta<typeof Composer>;
export default meta;
type Story = StoryObj<typeof meta>;
type PlayContext = Parameters<NonNullable<Story['play']>>[0];

function composerControls(canvas: PlayContext['canvas']): HTMLElement[] {
  return [
    canvas.getByRole('textbox', { name: 'Message' }),
    canvas.getByRole('button', { name: 'Attach' }),
    canvas.getByRole('button', { name: 'Agent and model' }),
    canvas.getByRole('button', { name: 'Stop' }),
  ];
}

function preservesComposer(
  agentIndex: number,
  requestKind: 'plan' | 'permission',
): Story {
  const permission = permissionMocks[agentIndex];
  const catalog = newSessionCatalogs.bothAvailable[agentIndex];
  const plan = planProposalMocks.find(
    (mock) => mock.agent === permission?.agent,
  );
  if (!plan || !permission || !catalog)
    throw new Error(
      'Recorded catalog needs both request kinds for each Agent.',
    );
  const onAnswer = fn();
  const request = permission.pending.snapshot.pendingPermission;
  if (!request) throw new Error('Recording needs a pending Permission.');
  const permissionRequest = {
    request,
    state: { kind: 'open' },
    onAnswer,
    onDenialMessageChange: fn(),
  } satisfies NonNullable<ComposerProps['permissionRequest']>;
  const allow = permissionRequest.request.options.find((option) =>
    option.kind.startsWith('allow'),
  );
  if (!allow) throw new Error('Recorded Permission needs an Allow option.');
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
      await expect(onAnswer).toHaveBeenCalledWith(
        requestKind === 'plan'
          ? { planId: plan.proposal.planId, decision: 'approve' }
          : { optionId: allow.optionId },
      );
      await expect(shownText(message)).toBe(keptDraft + addedText);
    },
  };
}

export const ClaudePlanKeepsComposer = preservesComposer(0, 'plan');
export const CodexPlanKeepsComposer = preservesComposer(1, 'plan');
export const ClaudePermissionKeepsComposer = preservesComposer(0, 'permission');
export const CodexPermissionKeepsComposer = preservesComposer(1, 'permission');

function expandedPlanKeepsComposer(agentIndex: number): Story {
  return {
    args: preservesComposer(agentIndex, 'plan').args,
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      const controls = composerControls(canvas);
      const message = canvas.getByRole('textbox', { name: 'Message' });
      await expect(shownText(message)).toBe(keptDraft);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand plan' }),
      );
      const dialog = await within(document.body).findByRole('dialog', {
        name: 'Expanded plan',
      });
      for (const control of controls) {
        await expect(control).toBeVisible();
        await waitFor(() =>
          expect(control.getBoundingClientRect().top).toBeGreaterThanOrEqual(
            dialog.getBoundingClientRect().bottom,
          ),
        );
        await expect(
          control.getBoundingClientRect().bottom,
        ).toBeLessThanOrEqual(window.innerHeight);
      }
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Collapse plan' }),
      );
      await waitFor(() =>
        expect(
          within(document.body).queryByRole('dialog', {
            name: 'Expanded plan',
          }),
        ).not.toBeInTheDocument(),
      );
      await expect(shownText(message)).toBe(keptDraft);
      await waitFor(() => expect(canPointAt(message)).toBe(true));
    },
  };
}

export const ClaudeExpandedPlanKeepsComposer = expandedPlanKeepsComposer(0);
export const CodexExpandedPlanKeepsComposer = expandedPlanKeepsComposer(1);
