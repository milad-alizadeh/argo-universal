import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { ComposerMock } from '../../mocks/composer-mock';
import { DesktopShellMock } from '../../mocks/desktop-shell-mock';
import { layoutWidths } from '../../mocks/each-layout';
import { expectFadeColor } from '../../mocks/fade-color';
import { InspectorFilesMock } from '../../mocks/inspector-files-mock';
import { shortPlanProposal } from '../../mocks/plan-proposal-mock';
import { settleViewport } from '../../mocks/settle-viewport';
import { UpdatingShellMock } from '../../mocks/updating-shell-mock';
import { PlanProposalRegion } from './plan-proposal-region';

const meta = {
  title: 'Tests/DesktopShell',
  component: DesktopShellMock,
  render: (args) => (
    <View className="h-[700px] w-full">
      <DesktopShellMock {...args} showInspectorControls />
    </View>
  ),
} satisfies Meta<typeof DesktopShellMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MainContentUsesAvailableWidth: Story = {
  render: () => (
    <View className="h-[700px] w-full">
      <DesktopShellMock showInspectorControls>
        <PlanProposalRegion testID="responsive-main-content">
          <View className="flex-1" />
          <View className="items-center px-4 pb-4">
            <ComposerMock
              sessionStarted
              draft={{ text: 'Keep my draft', images: [] }}
              onDraftChange={fn()}
              onAttachImages={fn()}
              onSend={fn()}
              planProposal={{
                proposal: shortPlanProposal,
                onAnswer: fn(),
                state: { kind: 'open' },
              }}
            />
          </View>
        </PlanProposalRegion>
      </DesktopShellMock>
    </View>
  ),
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const content = canvas.getByTestId('responsive-main-content');
    const approve = () => canvas.getByRole('button', { name: 'Approve' });
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(32),
    );
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeLessThan(720),
    );
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(44),
    );
    await expect(
      canvas.queryByText('session', { exact: true }),
    ).not.toBeInTheDocument();
    const keepPlanning = canvas.getByRole('button', { name: 'Keep planning' });
    await expect(keepPlanning.getBoundingClientRect().width).toBe(
      approve().getBoundingClientRect().width,
    );
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
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(720),
    );
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(32),
    );
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    const inspectorDivider = canvas.getByRole('separator', {
      name: 'Resize Inspector',
    });
    inspectorDivider.focus();
    await userEvent.keyboard('{ArrowLeft}'.repeat(20));
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeLessThan(720),
    );
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(44),
    );
    await userEvent.keyboard('{ArrowRight}'.repeat(20));
    await waitFor(() =>
      expect(content.getBoundingClientRect().width).toBeGreaterThanOrEqual(720),
    );
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(32),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Show sidebar' }));
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(44),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await waitFor(() =>
      expect(approve().getBoundingClientRect().height).toBe(32),
    );
    await expect(window.innerWidth).toBe(1440);
  },
};

export const ComposerUsesAvailableWidth: Story = {
  args: {
    children: (
      <View
        className="flex-1 justify-end px-4 pb-4"
        testID="responsive-composer"
      >
        <ComposerMock
          sessionStarted
          draft={{ text: 'Keep my draft', images: [] }}
          onDraftChange={fn()}
          onAttachImages={fn()}
          onSend={fn()}
        />
      </View>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const mode = canvas.getByRole('button', { name: 'Mode' });
    await waitFor(() =>
      expect(mode.getBoundingClientRect().width).toBeGreaterThan(28),
    );
    await expect(canvas.getByTestId('composer-agent-icon')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    await waitFor(() => expect(mode.getBoundingClientRect().width).toBe(28));
    await expect(
      canvas.queryByTestId('composer-agent-icon'),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByText('session', { exact: true }),
    ).not.toBeInTheDocument();
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
      'Keep my draft',
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await waitFor(() =>
      expect(mode.getBoundingClientRect().width).toBeGreaterThan(28),
    );
    await expect(canvas.getByTestId('composer-agent-icon')).toBeVisible();
    await expect(canvas.getByText('session', { exact: true })).toBeVisible();
    await expect(window.innerWidth).toBe(1440);
  },
};

function sectionsAndSidebar(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      await waitFor(() =>
        expect(
          canvas.getByTestId('desktop-list').getBoundingClientRect().width,
        ).toBeGreaterThan(100),
      );
      const shell = canvas.getByTestId('desktop-shell').getBoundingClientRect();
      const sidebar = canvas
        .getByTestId('desktop-list')
        .getBoundingClientRect();
      await expect(sidebar.left).toBeGreaterThanOrEqual(shell.left);
      await waitFor(() =>
        expect(
          canvas.getByTestId('desktop-list').getBoundingClientRect().right,
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
        await expect(
          canvas.getByRole('button', { name: section }),
        ).toHaveAttribute('aria-selected', 'true');
        await expect(canvas.getByTestId('list-content')).toHaveTextContent(
          `${section} list`,
        );
        await expect(canvas.getByTestId('detail-content')).toHaveTextContent(
          `${section} detail`,
        );
      }
      await userEvent.click(
        canvas.getByRole('button', { name: 'Hide sidebar' }),
      );
      await expect(canvas.getByTestId('desktop-list')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await expect(canvas.getByTestId('detail-content')).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Show sidebar' }),
      );
      await expect(canvas.getByTestId('list-content')).toBeVisible();
    },
  };
}
export const SectionsAndSidebarPhone = sectionsAndSidebar(layoutWidths.phone);
export const SectionsAndSidebarWide = sectionsAndSidebar(layoutWidths.wide);

function inspectorTakesTheDetailAreaAndRestoresIt(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(layoutWidths.wide);
      await waitFor(() =>
        expect(
          canvas.getByTestId('desktop-list').getBoundingClientRect().width,
        ).toBe(300),
      );
      const headerActions = canvas.getByTestId('desktop-detail-actions');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open Inspector' }),
      );
      await expect(canvas.getByTestId('desktop-detail-actions')).toBe(
        headerActions,
      );
      await expect(
        canvas.getByRole('button', { name: 'More actions' }),
      ).toBeVisible();
      await waitFor(() =>
        expect(canvas.getByTestId('desktop-inspector')).toHaveAttribute(
          'aria-hidden',
          'false',
        ),
      );
      await expect(canvas.getByTestId('inspector-content')).toBeVisible();
      await expect(canvas.getByTestId('detail-content')).toBeVisible();
      await waitFor(() =>
        expect(
          canvas.getByRole('button', { name: 'Expand Inspector' }),
        ).toBeVisible(),
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Expand Inspector' }),
      );
      await expect(canvas.getByTestId('desktop-detail')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await expect(canvas.getByTestId('list-content')).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Restore Inspector' }),
      );
      await expect(canvas.getByTestId('detail-content')).toBeVisible();
      await settleViewport(width);
      await waitFor(() =>
        expect(canvas.getByTestId('desktop-detail')).toHaveAttribute(
          'aria-hidden',
          'true',
        ),
      );
      await expect(canvas.getByTestId('inspector-content')).toBeVisible();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Restore Inspector' }),
      );
      await expect(canvas.getByTestId('desktop-detail')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close Inspector' }),
      );
      await expect(canvas.getByTestId('desktop-inspector')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open Inspector' }),
      );
      await expect(canvas.getByTestId('inspector-content')).toBeVisible();
      await settleViewport(layoutWidths.wide);
      await waitFor(() =>
        expect(canvas.getByTestId('detail-content')).toBeVisible(),
      );
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close Inspector' }),
      );
      await expect(canvas.getByTestId('desktop-inspector')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      await expect(canvas.getByTestId('detail-content')).toBeVisible();
    },
  };
}
// A width between the phone and wide layouts.
const tabletWidth = 720;
export const InspectorTakesTheDetailAreaAndRestoresItTablet =
  inspectorTakesTheDetailAreaAndRestoresIt(tabletWidth);
export const InspectorTakesTheDetailAreaAndRestoresItPhone =
  inspectorTakesTheDetailAreaAndRestoresIt(layoutWidths.phone);

export const DividersResizeAndRememberWidths: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const list = canvas.getByTestId('desktop-list');
    await waitFor(() => expect(list.getBoundingClientRect().width).toBe(300));
    const listWidth = list.getBoundingClientRect().width;
    const divider = canvas.getByRole('separator', { name: 'Resize sidebar' });
    const start = divider.getBoundingClientRect();
    await userEvent.pointer([
      {
        target: divider,
        coords: { clientX: start.x, clientY: start.y + 100 },
        keys: '[MouseLeft>]',
      },
      {
        target: divider,
        coords: { clientX: start.x + 60, clientY: start.y + 100 },
      },
      { target: divider, keys: '[/MouseLeft]' },
    ]);
    await expect(list.getBoundingClientRect().width).toBeGreaterThan(
      listWidth + 50,
    );
    const resizedListWidth = list.getBoundingClientRect().width;
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Show sidebar' }));
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(resizedListWidth),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    const inspector = canvas.getByTestId('desktop-inspector');
    await waitFor(() =>
      expect(inspector.getBoundingClientRect().width).toBe(380),
    );
    const inspectorWidth = inspector.getBoundingClientRect().width;
    const inspectorDivider = canvas.getByRole('separator', {
      name: 'Resize Inspector',
    });
    inspectorDivider.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(inspector.getBoundingClientRect().width).toBeGreaterThan(
      inspectorWidth,
    );
    const resizedInspectorWidth = inspector.getBoundingClientRect().width;
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Expand Inspector' }),
      ).toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector').getBoundingClientRect().width,
      ).toBe(resizedInspectorWidth),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector').getBoundingClientRect().width,
      ).toBe(resizedInspectorWidth),
    );
  },
};

export const NoAttention: Story = {
  args: { attentionCount: 0 },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.queryByLabelText(/Sessions? needs? attention/),
      ).toBeNull();
    }
  },
};

export const OneAttention: Story = {
  args: { attentionCount: 1 },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('1 Session needs attention'),
      ).toHaveTextContent('1');
    }
  },
};

export const OverflowAttention: Story = {
  args: { attentionCount: 100 },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
      await expect(
        canvas.getByLabelText('100 Sessions need attention'),
      ).toHaveTextContent('99+');
    }
  },
};

export const TogglesAnimateAndPreserveContent: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const list = canvas.getByTestId('desktop-list');
    const detail = canvas.getByTestId('desktop-detail');
    const detailContent = canvas.getByTestId('detail-content');
    await waitFor(() => expect(list.getBoundingClientRect().width).toBe(300));
    await waitFor(() =>
      expect(detail.getBoundingClientRect().width).toBe(
        canvas.getByTestId('desktop-shell').getBoundingClientRect().width -
          64 -
          8 -
          300,
      ),
    );
    const initialDetailWidth = detail.getBoundingClientRect().width;
    const samples: number[] = [];
    const titlePositions: number[] = [];
    const initialTitleLeft = canvas
      .getByTestId('desktop-detail-title')
      .getBoundingClientRect().left;
    const actionRight = canvas
      .getByTestId('desktop-detail-actions')
      .getBoundingClientRect().right;
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    for (let frame = 0; frame < 20; frame++) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const viewport = canvas.getByTestId('desktop-list-viewport');
      const inset = Number.parseFloat(
        getComputedStyle(viewport).clipPath.match(
          /inset\(0px ([\d.]+)px/,
        )?.[1] ?? '0',
      );
      samples.push(viewport.getBoundingClientRect().width - inset);
      titlePositions.push(
        canvas.getByTestId('desktop-detail-title').getBoundingClientRect().left,
      );
      await expect(
        canvas.getByTestId('desktop-detail-actions').getBoundingClientRect()
          .right,
      ).toBeCloseTo(actionRight, 1);
      await expect(
        canvas.getByTestId('desktop-list-content').getBoundingClientRect()
          .width,
      ).toBeCloseTo(300, 2);
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(samples.some((width) => width > 0 && width < 300)).toBe(
        true,
      );
      await expect(
        titlePositions.some(
          (position) => position > 112 && position < initialTitleLeft,
        ),
      ).toBe(true);
    }
    await waitFor(() => expect(list.getBoundingClientRect().width).toBe(0));
    await expect(detail.getBoundingClientRect().width).toBe(
      initialDetailWidth + 300,
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Show sidebar' }));
    await waitFor(() => expect(list.getBoundingClientRect().width).toBe(300));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector').getBoundingClientRect().width,
      ).toBe(380),
    );
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Expand Inspector' }),
      ).toBeVisible(),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await waitFor(() => expect(detail.getBoundingClientRect().width).toBe(0));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    );
    await waitFor(() =>
      expect(detail.getBoundingClientRect().width).toBe(
        initialDetailWidth - 380,
      ),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    );
    await waitFor(() =>
      expect(detail.getBoundingClientRect().width).toBe(initialDetailWidth),
    );
    await expect(canvas.getByTestId('detail-content')).toBe(detailContent);
  },
};

export const DragToCollapseExpandAndReopen: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const drag = async (name: string, distance: number) => {
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
          keys: '[MouseLeft>]',
        },
        {
          target: divider,
          coords: { clientX: start.x + 4 + distance, clientY: start.y + 100 },
        },
        { keys: '[/MouseLeft]' },
      ]);
    };
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(300),
    );
    await drag('Resize sidebar', -220);
    await expect(
      canvas.getByRole('button', { name: 'Show sidebar' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(0),
    );
    await drag('Resize sidebar', 220);
    await expect(
      canvas.getByRole('button', { name: 'Hide sidebar' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(300),
    );
    await drag('Resize Inspector', -240);
    await waitFor(() =>
      expect(
        canvas.getByRole('button', { name: 'Close Inspector' }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector').getBoundingClientRect().width,
      ).toBe(380),
    );
    await drag('Resize Inspector', -700);
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-detail').getBoundingClientRect().width,
      ).toBe(0),
    );
    await drag('Resize Inspector', 400);
    await expect(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-detail').getBoundingClientRect().width,
      ).toBeGreaterThan(350),
    );
    await drag('Resize Inspector', 800);
    await expect(
      canvas.getByRole('button', { name: 'More actions' }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-inspector').getBoundingClientRect().width,
      ).toBe(0),
    );
  },
};

export const ReversingAToggleKeepsTheCurrentVisualPosition: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const viewport = canvas.getByTestId('desktop-list-viewport');
    const visibleWidth = () =>
      viewport.getBoundingClientRect().width -
      Number.parseFloat(
        getComputedStyle(viewport).clipPath.match(
          /inset\(0px ([\d.]+)px/,
        )?.[1] ?? '0',
      );
    await waitFor(() => expect(visibleWidth()).toBe(300));
    await userEvent.click(canvas.getByRole('button', { name: 'Hide sidebar' }));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    const interruptedWidth = visibleWidth();
    await userEvent.click(canvas.getByRole('button', { name: 'Show sidebar' }));
    const resumedWidth = visibleWidth();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(Math.abs(resumedWidth - interruptedWidth)).toBeLessThan(100);
    }
    await waitFor(() => expect(visibleWidth()).toBe(300));
    await expect(
      canvas.getByTestId('desktop-list-content').getBoundingClientRect().width,
    ).toBe(300);
  },
};

export const ContentUpdatesKeepAnActiveToggleRunning: Story = {
  render: () => <UpdatingShellMock />,
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    // The detail pane animates the frame around its viewport.
    const frame = canvas.getByTestId('desktop-detail-viewport')
      .parentElement as HTMLElement;
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(300),
    );
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-detail').getBoundingClientRect().width,
      ).toBe(
        canvas.getByTestId('desktop-shell').getBoundingClientRect().width -
          64 -
          8 -
          300,
      ),
    );
    const { vi } = await import('vitest');
    const animations = vi.spyOn(frame, 'animate');
    try {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open Inspector' }),
      );
      await waitFor(() =>
        expect(animations.mock.results.length).toBeGreaterThan(0),
      );
      const activeAnimation = animations.mock.results[0]?.value as Animation;
      const started = animations.mock.calls.length;
      await userEvent.click(
        canvas.getByRole('button', { name: 'Update attention' }),
      );
      await expect(
        canvas.getByLabelText('2 Sessions need attention'),
      ).toBeVisible();
      await expect(animations.mock.calls).toHaveLength(started);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await expect(activeAnimation?.playState).not.toBe('idle');
      }
      await waitFor(() =>
        expect(
          frame
            .getAnimations()
            .some((animation) => animation.playState === 'running'),
        ).toBe(false),
      );
      await expect(canvas.getByTestId('detail-content')).toBeVisible();
    } finally {
      animations.mockRestore();
    }
  },
};

export const OneHeldDragCanCloseAndReopenPanels: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const sidebar = canvas.getByRole('separator', { name: 'Resize sidebar' });
    const start = sidebar.getBoundingClientRect();
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x + 4, clientY: start.y + 100 },
      keys: '[MouseLeft>]',
    });
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x - 220, clientY: start.y + 100 },
    });
    await expect(
      canvas.getByRole('button', { name: 'Show sidebar' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('separator', { name: 'Resize sidebar' }),
    ).toBe(sidebar);
    await expect(
      canvas
        .getByTestId('desktop-list-viewport')
        .getAnimations()
        .some((animation) => animation.playState === 'running'),
    ).toBe(false);
    await expect(
      canvas
        .getByTestId('desktop-detail-title')
        .getAnimations()
        .some((animation) => animation.playState === 'running'),
    ).toBe(false);
    await userEvent.pointer({
      target: sidebar,
      coords: { clientX: start.x + 4, clientY: start.y + 100 },
    });
    await expect(
      canvas.getByRole('button', { name: 'Hide sidebar' }),
    ).toBeVisible();
    await userEvent.pointer({ keys: '[/MouseLeft]' });

    await userEvent.click(
      canvas.getByRole('button', { name: 'Open Inspector' }),
    );
    const inspector = canvas.getByRole('separator', {
      name: 'Resize Inspector',
    });
    const inspectorStart = inspector.getBoundingClientRect();
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x + 4,
        clientY: inspectorStart.y + 100,
      },
      keys: '[MouseLeft>]',
    });
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x - 900,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('separator', { name: 'Resize Inspector' }),
    ).toBe(inspector);
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x + 800,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(
      canvas.getByRole('button', { name: 'More actions' }),
    ).toBeVisible();
    await expect(
      canvas.getByRole('separator', { name: 'Resize Inspector' }),
    ).toBe(inspector);
    await userEvent.pointer({
      target: inspector,
      coords: {
        clientX: inspectorStart.x - 100,
        clientY: inspectorStart.y + 100,
      },
    });
    await expect(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    ).toBeVisible();
    await userEvent.pointer({ keys: '[/MouseLeft]' });
  },
};

export const ExpandedInspectorKeepsBothDividerEdgesUsable: Story = {
  args: { inspectorState: 'expanded' },
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(300),
    );
    const sidebar = canvas.getByRole('separator', { name: 'Resize sidebar' });
    const inspector = canvas.getByRole('separator', {
      name: 'Resize Inspector',
    });
    const start = sidebar.getBoundingClientRect();
    const inspectorStart = inspector.getBoundingClientRect();
    await expect(document.elementFromPoint(start.x + 4, start.y + 100)).toBe(
      sidebar,
    );
    await expect(
      document.elementFromPoint(inspectorStart.x + 4, inspectorStart.y + 100),
    ).toBe(inspector);
    await userEvent.pointer([
      {
        target: sidebar,
        coords: { clientX: start.x + 4, clientY: start.y + 100 },
        keys: '[MouseLeft>]',
      },
      {
        target: sidebar,
        coords: { clientX: start.x + 64, clientY: start.y + 100 },
      },
      { keys: '[/MouseLeft]' },
    ]);
    await expect(
      canvas.getByTestId('desktop-list').getBoundingClientRect().width,
    ).toBe(360);
    await expect(
      canvas.getByRole('button', { name: 'Restore Inspector' }),
    ).toBeVisible();
  },
};

export const HeaderMenuDoesNotOpenInspector: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: 'Example action' }),
      ).toBeVisible(),
    );
    await expect(canvas.getByTestId('desktop-inspector')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    await userEvent.keyboard('{Escape}');
  },
};

// The Inspector scrolls as a whole and fades under its toolbar into the panel behind it.
export const InspectorFadesIntoTheAppBackground: Story = {
  args: {
    inspectorState: 'open',
    inspector: <InspectorFilesMock />,
  },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    const inspector = await canvas.findByTestId('desktop-inspector-scroll');
    await waitFor(() =>
      expect(inspector.scrollHeight).toBeGreaterThan(inspector.clientHeight),
    );
    inspector.scrollTop = 60;
    const title = canvas.getByTestId('desktop-inspector-title');
    await waitFor(() => {
      const fade = inspector.parentElement?.querySelector(
        ':scope > [data-testid="scroll-fade-top"]',
      );
      expect(fade).toBeTruthy();
      if (!fade) return;
      expect(fade.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        title.getBoundingClientRect().bottom - 1,
      );
      expectFadeColor(fade, canvas.getByTestId('desktop-panel'));
    });
  },
};
