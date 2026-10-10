import { PortalHost } from '@rn-primitives/portal';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useLayoutEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { page } from 'vitest/browser';
import { Composer } from '#features/composer';
import { PlanProposalRegion } from '#features/requests';
import { composerProps } from '../../../../mocks/composer-mock';
import { shortPlanProposal } from '../../../../mocks/plan-proposal-mock';
import { layoutWidths } from '../../../lib/generic/each-layout';
import { settleViewport } from '../../../lib/generic/settle-viewport';
import { DesktopShell } from './desktop-shell';
import { DesktopShellFrame } from './desktop-shell-frame.mocks';
import { InspectorFilesMock } from './inspector-files.mocks';

const preservedDraft = 'Keep my draft';
const hideSidebarLabel = 'Hide sidebar';
const resizeInspectorLabel = 'Resize Inspector';
const showSidebarLabel = 'Show sidebar';
const closeInspectorLabel = 'Close Inspector';
const agentIconId = 'composer-agent-icon';
const sessionListId = 'desktop-list';
const desktopShellId = 'desktop-shell';
const listContentId = 'list-content';
const detailContentId = 'detail-content';
const hiddenAttribute = 'aria-hidden';
const detailActionsId = 'desktop-detail-actions';
const moreActionsLabel = 'More actions';
const inspectorId = 'desktop-inspector';
const inspectorContentId = 'inspector-content';
const expandInspectorLabel = 'Expand Inspector';
const detailId = 'desktop-detail';
const restoreInspectorLabel = 'Restore Inspector';
const resizeSidebarLabel = 'Resize sidebar';
const pointerPress = '[MouseLeft>]';
const pointerRelease = '[/MouseLeft]';

const meta = {
  title: 'Tests/DesktopShell',
  component: DesktopShell,
  args: {
    selectedSection: 'sessions',
    attentionCount: 1,
    sidebarShown: true,
    inspectorState: 'closed',
    onSectionChange: fn(),
    onSidebarShownChange: fn(),
    onInspectorStateChange: fn(),
    listHeader: null,
    list: null,
    detailHeader: null,
    children: null,
    inspectorHeader: null,
    inspector: null,
  },
  render: (): React.JSX.Element => (
    <View testID="controlled-shell" className="w-full" />
  ),
} satisfies Meta<typeof DesktopShell>;

function CommittedShell({
  children,
  onCommit,
}: {
  children: React.ReactNode;
  onCommit: () => void;
}): React.ReactNode {
  useLayoutEffect(onCommit, [onCommit]);
  return children;
}

function mountShell(
  element: HTMLElement,
  initial: React.ComponentProps<typeof DesktopShellFrame>,
): {
  root: ReturnType<typeof createRoot>;
  render: (
    props: Partial<React.ComponentProps<typeof DesktopShellFrame>>,
  ) => Promise<void>;
  onSectionChange: ReturnType<typeof fn>;
  onSidebarShownChange: ReturnType<typeof fn>;
  onInspectorStateChange: ReturnType<typeof fn>;
} {
  const root = createRoot(element);
  const onSectionChange = fn();
  const onSidebarShownChange = fn();
  const onInspectorStateChange = fn();
  let props = initial;
  const render = async (next: Partial<typeof initial>): Promise<void> => {
    props = { ...props, ...next };
    await new Promise<void>((resolve) =>
      root.render(
        <CommittedShell onCommit={resolve}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <View className="h-[700px] w-full">
                <DesktopShellFrame
                  {...props}
                  onSectionChange={onSectionChange}
                  onSidebarShownChange={onSidebarShownChange}
                  onInspectorStateChange={onInspectorStateChange}
                />
              </View>
              <PortalHost />
            </KeyboardProvider>
          </SafeAreaProvider>
        </CommittedShell>,
      ),
    );
    await new Promise(requestAnimationFrame);
  };
  return {
    root,
    render,
    onSectionChange,
    onSidebarShownChange,
    onInspectorStateChange,
  };
}

function controlledPlay(
  play: (
    context: Parameters<NonNullable<Story['play']>>[0],
    controlled: ReturnType<typeof mountShell>,
  ) => Promise<void>,
): NonNullable<Story['play']> {
  return async (context) => {
    const controlled = mountShell(
      context.canvas.getByTestId('controlled-shell'),
      context.args,
    );
    try {
      await controlled.render({});
      await context.canvas.findByTestId(desktopShellId);
      await play(context, controlled);
    } finally {
      controlled.root.unmount();
    }
  };
}

export default meta;
type Story = StoryObj<typeof meta>;

export const MainContentUsesAvailableWidth: Story = {
  args: {
    children: (
      <PlanProposalRegion testID="responsive-main-content">
        <View className="flex-1" />
        <View className="items-center px-4 pb-4">
          <Composer
            {...composerProps({
              sessionStarted: true,
              draft: { text: preservedDraft, images: [] },
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
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const content = canvas.getByTestId('responsive-main-content');
    const approve = (): HTMLElement =>
      canvas.getByRole('button', { name: 'Approve' });
    await waitFor(() => expect(approve()).toBeVisible());
    await expect(
      await canvas.findByText('session', { exact: true }),
    ).toBeVisible();
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.queryByText('session', { exact: true }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(approve()).toBeVisible());
    await waitFor(() =>
      expect(
        canvas.queryByText('session', { exact: true }),
      ).not.toBeInTheDocument(),
    );
    const keepPlanning = canvas.getByRole('button', {
      name: 'Keep planning',
    });
    await expect(keepPlanning).toBeVisible();
    await expect(approve().getBoundingClientRect().right).toBeLessThanOrEqual(
      content.getBoundingClientRect().right,
    );
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
    await userEvent.click(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      false,
    );
    await controlled.render({ sidebarShown: false });
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(720),
    );
    await waitFor(() => expect(approve()).toBeVisible());
    await expect(
      await canvas.findByText('session', { exact: true }),
    ).toBeVisible();
    const inspectorDivider = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });
    inspectorDivider.focus();
    await userEvent.keyboard('{ArrowLeft}'.repeat(20));
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeLessThan(720),
    );
    await waitFor(() => expect(approve()).toBeVisible());
    await userEvent.keyboard('{ArrowRight}'.repeat(20));
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(720),
    );
    await waitFor(() => expect(approve()).toBeVisible());
    await userEvent.click(
      canvas.getByRole('button', { name: showSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      true,
    );
    await controlled.render({ sidebarShown: true });
    await waitFor(() => expect(approve()).toBeVisible());
    await userEvent.click(
      canvas.getByRole('button', { name: closeInspectorLabel }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'closed',
    );
    await controlled.render({ inspectorState: 'closed' });
    await waitFor(() => expect(approve()).toBeVisible());
    await expect(window.innerWidth).toBe(1440);
  }),
};

export const ComposerUsesAvailableWidth: Story = {
  args: {
    children: (
      <View
        className="flex-1 justify-end px-4 pb-4"
        testID="responsive-composer"
      >
        <Composer
          {...composerProps({
            sessionStarted: true,
            draft: { text: preservedDraft, images: [] },
            onDraftChange: fn(),
            onAttachImages: fn(),
            onSend: fn(),
          })}
        />
      </View>
    ),
  },
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const mode = canvas.getByRole('button', { name: 'Mode' });
    await waitFor(() => expect(mode).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(canvas.queryByTestId(agentIconId)).not.toBeInTheDocument(),
    );
    await expect(canvas.queryByTestId(agentIconId)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        canvas.queryByText('session', { exact: true }),
      ).not.toBeInTheDocument(),
    );
    const content = canvas
      .getByTestId('responsive-composer')
      .getBoundingClientRect();
    for (const name of ['Mode', 'Usage', 'Context window', 'Send']) {
      const control = canvas
        .getByRole('button', { name })
        .getBoundingClientRect();
      await expect(control.left).toBeGreaterThanOrEqual(content.left);
      await expect(control.right).toBeLessThanOrEqual(content.right);
    }
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveValue(
      preservedDraft,
    );
    await userEvent.click(
      canvas.getByRole('button', { name: closeInspectorLabel }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'closed',
    );
    await controlled.render({ inspectorState: 'closed' });
    await waitFor(() => expect(mode).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId(agentIconId)).toBeVisible());
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    await expect(window.innerWidth).toBe(1440);
  }),
};

function sectionsAndSidebar(width: number): Story {
  return {
    play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
      await settleViewport(width);
      await waitFor(() =>
        expect(
          canvas.getByTestId(sessionListId).getBoundingClientRect().width,
        ).toBeGreaterThan(100),
      );
      const shell = canvas.getByTestId(desktopShellId).getBoundingClientRect();
      const sidebar = canvas.getByTestId(sessionListId).getBoundingClientRect();
      await expect(sidebar.left).toBeGreaterThanOrEqual(shell.left);
      await waitFor(() =>
        expect(
          canvas.getByTestId(sessionListId).getBoundingClientRect().right,
        ).toBeLessThanOrEqual(shell.right),
      );
      const rail = canvas.getByTestId('desktop-rail');
      const railButtons = new Map(
        ['Sessions', 'Issues', 'Atlas', 'Settings'].map((name) => [
          name,
          canvas.getByRole('button', { name }),
        ]),
      );
      for (const section of ['Sessions', 'Issues', 'Atlas', 'Settings']) {
        await expect(canvas.getByTestId('desktop-rail')).toBe(rail);
        await expect(canvas.getByRole('button', { name: section })).toBe(
          railButtons.get(section),
        );
        await userEvent.click(canvas.getByRole('button', { name: section }));
        await expect(controlled.onSectionChange).toHaveBeenLastCalledWith(
          section.toLowerCase(),
        );
        await controlled.render({
          selectedSection:
            (
              ['sessions', 'issues', 'atlas', 'settings'] satisfies NonNullable<
                React.ComponentProps<
                  typeof DesktopShellFrame
                >['selectedSection']
              >[]
            ).find((value) => value === section.toLowerCase()) ?? 'sessions',
        });
        await expect(
          canvas.getByRole('button', { name: section }),
        ).toHaveAttribute('aria-selected', 'true');
        await expect(canvas.getByTestId(listContentId)).toHaveTextContent(
          `${section} list`,
        );
        await expect(canvas.getByTestId(detailContentId)).toHaveTextContent(
          `${section} detail`,
        );
      }
      await userEvent.click(
        canvas.getByRole('button', { name: hideSidebarLabel }),
      );
      await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
        false,
      );
      await controlled.render({ sidebarShown: false });
      await expect(canvas.getByTestId(sessionListId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: showSidebarLabel }),
      );
      await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
        true,
      );
      await controlled.render({ sidebarShown: true });
      await expect(canvas.getByTestId(listContentId)).toBeVisible();
    }),
  };
}
export const SectionsAndSidebarPhone = sectionsAndSidebar(layoutWidths.phone);
export const SectionsAndSidebarWide = sectionsAndSidebar(layoutWidths.wide);

function inspectorTakesTheDetailAreaAndRestoresIt(width: number): Story {
  return {
    play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
      await settleViewport(layoutWidths.wide);
      const headerActions = canvas.getByTestId(detailActionsId);
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByTestId(detailActionsId)).toBe(headerActions);
      await expect(
        canvas.getByRole('button', { name: moreActionsLabel }),
      ).toBeVisible();
      await waitFor(() =>
        expect(canvas.getByTestId(inspectorId)).toHaveAttribute(
          hiddenAttribute,
          'false',
        ),
      );
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await waitFor(() =>
        expect(
          canvas.getByRole('button', { name: expandInspectorLabel }),
        ).toBeVisible(),
      );
      await userEvent.click(
        canvas.getByRole('button', { name: expandInspectorLabel }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        'expanded',
      );
      await controlled.render({ inspectorState: 'expanded' });
      await expect(canvas.getByTestId(detailId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await expect(canvas.getByTestId(listContentId)).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: restoreInspectorLabel }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        'open',
      );
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
      await settleViewport(width);
      await waitFor(() =>
        expect(canvas.getByTestId(detailId)).toHaveAttribute(
          hiddenAttribute,
          'true',
        ),
      );
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: restoreInspectorLabel }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        'open',
      );
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByTestId(detailId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: closeInspectorLabel }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        'closed',
      );
      await controlled.render({ inspectorState: 'closed' });
      await expect(canvas.getByTestId(inspectorId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await controlled.render({ inspectorState: 'open' });
      await expect(canvas.getByTestId(inspectorContentId)).toBeVisible();
      await settleViewport(layoutWidths.wide);
      await waitFor(() =>
        expect(canvas.getByTestId(detailContentId)).toBeVisible(),
      );
      await userEvent.click(
        canvas.getByRole('button', { name: closeInspectorLabel }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        'closed',
      );
      await controlled.render({ inspectorState: 'closed' });
      await expect(canvas.getByTestId(inspectorId)).toHaveAttribute(
        hiddenAttribute,
        'true',
      );
      await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    }),
  };
}
// A width between the phone and wide layouts.
const tabletWidth = 720;
export const InspectorTakesTheDetailAreaAndRestoresItTablet =
  inspectorTakesTheDetailAreaAndRestoresIt(tabletWidth);
export const InspectorTakesTheDetailAreaAndRestoresItPhone =
  inspectorTakesTheDetailAreaAndRestoresIt(layoutWidths.phone);

export const DividersResizeAndRememberWidths: Story = {
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const list = canvas.getByTestId(sessionListId);
    const listWidth = list.getBoundingClientRect().width;
    const divider = canvas.getByRole('separator', { name: resizeSidebarLabel });
    const start = divider.getBoundingClientRect();
    await userEvent.pointer([
      {
        target: divider,
        coords: { clientX: start.x, clientY: start.y + 100 },
        keys: pointerPress,
      },
      {
        target: divider,
        coords: { clientX: start.x + 60, clientY: start.y + 100 },
      },
      { target: divider, keys: pointerRelease },
    ]);
    await expect(list.getBoundingClientRect().width).toBeGreaterThan(
      listWidth + 50,
    );
    const resizedListWidth = list.getBoundingClientRect().width;
    await userEvent.click(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      false,
    );
    await controlled.render({ sidebarShown: false });
    await userEvent.click(
      canvas.getByRole('button', { name: showSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      true,
    );
    await controlled.render({ sidebarShown: true });
    await waitFor(() =>
      expect(
        canvas.getByTestId(sessionListId).getBoundingClientRect().width,
      ).toBe(resizedListWidth),
    );
    await controlled.render({ inspectorState: 'open' });
    const inspector = canvas.getByTestId(inspectorId);
    const inspectorWidth = inspector.getBoundingClientRect().width;
    const inspectorDivider = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });
    inspectorDivider.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(inspector.getBoundingClientRect().width).toBeGreaterThan(
      inspectorWidth,
    );
    const resizedInspectorWidth = inspector.getBoundingClientRect().width;
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: expandInspectorLabel }),
      ).toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: expandInspectorLabel }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'expanded',
    );
    await controlled.render({ inspectorState: 'expanded' });
    await userEvent.click(
      canvas.getByRole('button', { name: restoreInspectorLabel }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'open',
    );
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.getByTestId(inspectorId).getBoundingClientRect().width,
      ).toBe(resizedInspectorWidth),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: closeInspectorLabel }),
    );
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'closed',
    );
    await controlled.render({ inspectorState: 'closed' });
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.getByTestId(inspectorId).getBoundingClientRect().width,
      ).toBe(resizedInspectorWidth),
    );
  }),
};

export const NoAttention: Story = {
  args: { attentionCount: 0 },
  play: controlledPlay(async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.queryByLabelText(/Sessions? needs? attention/),
      ).toBeNull();
    }
  }),
};

export const OneAttention: Story = {
  args: { attentionCount: 1 },
  play: controlledPlay(async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('1 Session needs attention'),
      ).toHaveTextContent('1');
    }
  }),
};

export const OverflowAttention: Story = {
  args: { attentionCount: 100 },
  play: controlledPlay(async ({ canvas }) => {
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('100 Sessions need attention'),
      ).toHaveTextContent('99+');
    }
  }),
};

export const TogglesPreserveContent: Story = {
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const content = canvas.getByTestId(detailContentId);
    for (const shown of [false, true]) {
      await userEvent.click(
        canvas.getByRole('button', {
          name: shown ? showSidebarLabel : hideSidebarLabel,
        }),
      );
      await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
        shown,
      );
      await controlled.render({ sidebarShown: shown });
      await expect(
        canvas.getByRole('button', {
          name: shown ? hideSidebarLabel : showSidebarLabel,
        }),
      ).toBeVisible();
      await expect(canvas.getByTestId(detailContentId)).toBe(content);
    }
    await controlled.render({ inspectorState: 'open' });
    for (const [button, state] of [
      [expandInspectorLabel, 'expanded'],
      [restoreInspectorLabel, 'open'],
      [closeInspectorLabel, 'closed'],
    ] as const) {
      await userEvent.click(
        await canvas.findByRole('button', { name: button }),
      );
      await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
        state,
      );
      await controlled.render({ inspectorState: state });
      await expect(canvas.getByTestId(detailContentId)).toBe(content);
    }
    await expect(content).toBeVisible();
  }),
};

export const DragToCollapseExpandAndReopen: Story = {
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const drag = async (name: string, distance: number): Promise<void> => {
      const divider = canvas.getByRole('separator', { name });
      const start = divider.getBoundingClientRect();
      await expect(start.height).toBeGreaterThan(100);
      await expect(document.elementFromPoint(start.x + 4, start.y + 100)).toBe(
        divider,
      );
      await userEvent.pointer([
        {
          target: divider,
          coords: { clientX: start.x + 4, clientY: start.y + 100 },
          keys: pointerPress,
        },
        {
          target: divider,
          coords: { clientX: start.x + 4 + distance, clientY: start.y + 100 },
        },
        { keys: pointerRelease },
      ]);
    };
    await drag(resizeSidebarLabel, -220);
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      false,
    );
    await controlled.render({ sidebarShown: false });
    await expect(
      canvas.getByRole('button', { name: showSidebarLabel }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId(sessionListId).getBoundingClientRect().width,
      ).toBe(0),
    );
    await drag(resizeSidebarLabel, 220);
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      true,
    );
    await controlled.render({ sidebarShown: true });
    await expect(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    ).toBeVisible();
    await drag(resizeInspectorLabel, -240);
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'open',
    );
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: closeInspectorLabel }),
      ).toBeVisible(),
    );
    await drag(resizeInspectorLabel, -700);
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'expanded',
    );
    await controlled.render({ inspectorState: 'expanded' });
    await waitFor(() =>
      expect(canvas.getByTestId(detailId).getBoundingClientRect().width).toBe(
        0,
      ),
    );
    await drag(resizeInspectorLabel, 400);
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'open',
    );
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: expandInspectorLabel }),
      ).toBeVisible(),
    );
    await drag(resizeInspectorLabel, 800);
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'closed',
    );
    await controlled.render({ inspectorState: 'closed' });
    await expect(
      canvas.getByRole('button', { name: moreActionsLabel }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId(inspectorId).getBoundingClientRect().width,
      ).toBe(0),
    );
  }),
};

export const ReversingAToggleRestoresTheSidebar: Story = {
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    await userEvent.click(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      false,
    );
    await controlled.render({ sidebarShown: false });
    await userEvent.click(
      canvas.getByRole('button', { name: showSidebarLabel }),
    );
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      true,
    );
    await controlled.render({ sidebarShown: true });
    await waitFor(() =>
      expect(canvas.getByTestId('desktop-list-content')).toBeVisible(),
    );
  }),
};

export const ContentUpdatesDuringPanelToggle: Story = {
  play: controlledPlay(async ({ canvas }, controlled) => {
    await page.viewport(1440, 844);
    await controlled.render({ inspectorState: 'open' });
    await controlled.render({ attentionCount: 2 });
    await expect(
      canvas.getByLabelText('2 Sessions need attention'),
    ).toBeVisible();
    await expect(canvas.getByTestId(detailContentId)).toBeVisible();
    await expect(
      await canvas.findByRole('button', { name: closeInspectorLabel }),
    ).toBeVisible();
  }),
};

export const OneHeldDragCanCloseAndReopenPanels: Story = {
  play: controlledPlay(async ({ canvas, userEvent }, controlled) => {
    await page.viewport(1440, 844);
    const sidebar = canvas.getByRole('separator', { name: resizeSidebarLabel });
    const start = sidebar.getBoundingClientRect();
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x + 4, clientY: start.y + 100 },
      keys: pointerPress,
    });
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x - 220, clientY: start.y + 100 },
    });
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      false,
    );
    await controlled.render({ sidebarShown: false });
    await expect(
      canvas.getByRole('button', { name: showSidebarLabel }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('separator', { name: resizeSidebarLabel }),
    ).toBe(sidebar);
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x + 4, clientY: start.y + 100 },
    });
    await expect(controlled.onSidebarShownChange).toHaveBeenLastCalledWith(
      true,
    );
    await controlled.render({ sidebarShown: true });
    await expect(
      canvas.getByRole('button', { name: hideSidebarLabel }),
    ).toBeVisible();
    await userEvent.pointer({ keys: pointerRelease });
    await controlled.render({ inspectorState: 'open' });
    const inspector = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });
    const inspectorStart = inspector.getBoundingClientRect();
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x + 4,
        clientY: inspectorStart.y + 100,
      },
      keys: pointerPress,
    });
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x - 900,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'expanded',
    );
    await controlled.render({ inspectorState: 'expanded' });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: restoreInspectorLabel }),
      ).toBeVisible(),
    );
    await expect(
      canvas.getByRole('separator', { name: resizeInspectorLabel }),
    ).toBe(inspector);
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x + 800,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'closed',
    );
    await controlled.render({ inspectorState: 'closed' });
    await expect(
      canvas.getByRole('button', { name: moreActionsLabel }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('separator', { name: resizeInspectorLabel }),
    ).toBe(inspector);
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x - 100,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(controlled.onInspectorStateChange).toHaveBeenLastCalledWith(
      'open',
    );
    await controlled.render({ inspectorState: 'open' });
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: closeInspectorLabel }),
      ).toBeVisible(),
    );
    await userEvent.pointer({ keys: pointerRelease });
  }),
};

export const ExpandedInspectorKeepsBothDividerEdgesUsable: Story = {
  args: { inspectorState: 'expanded' },
  play: controlledPlay(async ({ canvas, userEvent }) => {
    await page.viewport(1440, 844);
    await waitFor(() =>
      expect(
        canvas.getByTestId(sessionListId).getBoundingClientRect().width,
      ).toBe(300),
    );
    const sidebar = canvas.getByRole('separator', { name: resizeSidebarLabel });
    const inspector = canvas.getByRole('separator', {
      name: resizeInspectorLabel,
    });
    const start = sidebar.getBoundingClientRect();
    const inspectorStart = inspector.getBoundingClientRect();
    await expect(document.elementFromPoint(start.x + 4, start.y + 100)).toBe(
      sidebar,
    );
    await expect(
      document.elementFromPoint(inspectorStart.x + 4, inspectorStart.y + 100),
    ).toBe(inspector);
    const listWidth = canvas
      .getByTestId(sessionListId)
      .getBoundingClientRect().width;
    await userEvent.pointer([
      {
        target: sidebar,
        coords: { clientX: start.x + 4, clientY: start.y + 100 },
        keys: pointerPress,
      },
      {
        target: sidebar,
        coords: { clientX: start.x + 64, clientY: start.y + 100 },
      },
      { keys: pointerRelease },
    ]);
    await expect(
      canvas.getByTestId(sessionListId).getBoundingClientRect().width,
    ).toBeGreaterThan(listWidth);
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: restoreInspectorLabel }),
      ).toBeVisible(),
    );
  }),
};

export const HeaderMenuDoesNotOpenInspector: Story = {
  play: controlledPlay(async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: moreActionsLabel }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: 'Example action' }),
      ).toBeVisible(),
    );
    await expect(canvas.getByTestId(inspectorId)).toHaveAttribute(
      hiddenAttribute,
      'true',
    );
    await userEvent.keyboard('{Escape}');
  }),
};

// The Inspector scrolls as a whole and fades under its toolbar into the panel behind it.
export const InspectorScrollKeepsHeaderReachable: Story = {
  args: {
    inspectorState: 'open',
    inspector: <InspectorFilesMock />,
  },
  play: controlledPlay(async ({ canvas }) => {
    await page.viewport(1440, 844);
    const inspector = await canvas.findByTestId('desktop-inspector-scroll');
    await waitFor(() =>
      expect(inspector.scrollHeight).toBeGreaterThan(inspector.clientHeight),
    );
    inspector.scrollTop = 60;
    const title = canvas.getByTestId('desktop-inspector-title');
    await waitFor(async () => {
      const fade = inspector.parentElement?.querySelector(
        ':scope > [data-testid="scroll-fade-top"]',
      );
      await expect(fade).toBeTruthy();
      if (!fade) return;
      await expect(fade.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom - 1,
      );
    });
  }),
};
