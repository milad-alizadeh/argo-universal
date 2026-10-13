import type { Meta } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Composer } from '#features/composer';
import { PlanProposalRegion } from '#features/requests';
import { composerProps } from '../../../../../mocks/composer-mock';
import { shortPlanProposal } from '../../../../../mocks/plan-proposal-mock';
import { contentWideMin } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  pressInspectorButton,
  resizeInspectorLabel,
  toggleSidebar,
} from './desktop-shell-controls.mocks';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';
import {
  controlledPlay,
  narrowDesktopWidth,
  preservedDraft,
  shellMeta,
  type ShellPlayContext,
  type ShellStory,
} from './desktop-shell-test.mocks';

const meta = {
  title: 'Tests/DesktopShell/Content width',
  ...shellMeta,
} satisfies Meta<typeof DesktopShellFrame>;
export default meta;

type Canvas = ShellPlayContext['canvas'];

const approve = (canvas: Canvas): HTMLElement =>
  canvas.getByRole('button', { name: 'Approve' });

async function waitForApprove(canvas: Canvas): Promise<void> {
  await waitFor(() => expect(approve(canvas)).toBeVisible());
}

async function expectSessionLabel(canvas: Canvas): Promise<void> {
  await expect(
    await canvas.findByText('session', { exact: true }),
  ).toBeVisible();
}

async function waitForSessionLabelGone(canvas: Canvas): Promise<void> {
  await waitFor(() =>
    expect(
      canvas.queryByText('session', { exact: true }),
    ).not.toBeInTheDocument(),
  );
}

async function waitUntilWide(content: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(
      contentWideMin(),
    ),
  );
}

async function waitUntilNarrow(content: HTMLElement): Promise<void> {
  await waitFor(() =>
    expect(content.getBoundingClientRect().width).toBeLessThan(
      contentWideMin(),
    ),
  );
}

async function expectExpandedPlanInside(
  { canvas, userEvent }: ShellPlayContext,
  content: HTMLElement,
): Promise<void> {
  await userEvent.click(canvas.getByRole('button', { name: 'Expand plan' }));
  const dialog = await within(document.body).findByRole('dialog', {
    name: 'Expanded plan',
  });
  await expect(dialog.getBoundingClientRect().left).toBeGreaterThanOrEqual(
    content.getBoundingClientRect().left,
  );
  await expect(dialog.getBoundingClientRect().right).toBeLessThanOrEqual(
    content.getBoundingClientRect().right,
  );
  await userEvent.click(
    within(dialog).getByRole('button', { name: 'Collapse plan' }),
  );
}

export const MainContentUsesAvailableWidth: ShellStory = {
  args: {
    children: (
      <PlanProposalRegion testID="responsive-main-content">
        <View className="flex-1" />
        <View className="items-center px-4 pb-4">
          <Composer
            {...composerProps({
              sessionStarted: true,
              draft: { text: preservedDraft, attachments: [] },
              onDraftChange: fn(),
              onAttachImages: fn(),
              onSend: fn(),
              planProposal: {
                proposal: shortPlanProposal,
                onAnswer: fn(),
                state: { kind: 'open' },
              },
            })}
          />
        </View>
      </PlanProposalRegion>
    ),
  },
  play: controlledPlay(async (context, controlled) => {
    const { canvas, userEvent } = context;
    await settleViewport(narrowDesktopWidth);
    const content = canvas.getByTestId('responsive-main-content');
    await waitForApprove(canvas);
    await expectSessionLabel(canvas);
    await controlled.render({ inspectorState: 'open' });
    await waitForSessionLabelGone(canvas);
    await waitForApprove(canvas);
    await waitForSessionLabelGone(canvas);
    await expect(
      canvas.getByRole('button', { name: 'Keep planning' }),
    ).toBeVisible();
    await expect(
      approve(canvas).getBoundingClientRect().right,
    ).toBeLessThanOrEqual(content.getBoundingClientRect().right);
    await expectExpandedPlanInside(context, content);
    await toggleSidebar(context, controlled, false);
    await waitUntilWide(content);
    await waitForApprove(canvas);
    await expectSessionLabel(canvas);
    canvas.getByRole('separator', { name: resizeInspectorLabel }).focus();
    await userEvent.keyboard('{ArrowLeft}'.repeat(20));
    await waitUntilNarrow(content);
    await waitForApprove(canvas);
    await userEvent.keyboard('{ArrowRight}'.repeat(20));
    await waitUntilWide(content);
    await waitForApprove(canvas);
    await toggleSidebar(context, controlled, true);
    await waitForApprove(canvas);
    await pressInspectorButton(context, controlled, 'closed');
    await waitForApprove(canvas);
    await expect(window.innerWidth).toBe(narrowDesktopWidth);
  }),
};
