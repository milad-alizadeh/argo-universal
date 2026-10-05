import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, screen, waitFor } from 'storybook/test';
import { DesktopShellMock } from '../../mocks/desktop-shell-mock';
import { UpdatingShellMock } from '../../mocks/updating-shell-mock';

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

export const SectionsAndSidebar: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    for (const width of [390, 1440]) {
      await page.viewport(width, 844);
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
    }
  },
};

export const InspectorTakesTheDetailAreaAndRestoresIt: Story = {
  play: async ({ canvas, userEvent }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
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
    for (const width of [720, 390]) {
      await page.viewport(width, 844);
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
    }
    await page.viewport(1440, 844);
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
    await expect(
      canvas.getByRole('button', { name: 'Close Inspector' }),
    ).toBeVisible();
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
    const viewport = canvas.getByTestId('desktop-detail-viewport');
    await waitFor(() =>
      expect(
        canvas.getByTestId('desktop-list').getBoundingClientRect().width,
      ).toBe(300),
    );
    const { vi } = await import('vitest');
    const animations = vi.spyOn(viewport, 'animate');
    try {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Open Inspector' }),
      );
      await waitFor(() =>
        expect(animations.mock.results.length).toBeGreaterThan(0),
      );
      const activeAnimation = animations.mock.results[0]?.value as Animation;
      const frameWidth = viewport.getBoundingClientRect().width;
      await userEvent.click(
        canvas.getByRole('button', { name: 'Update attention' }),
      );
      await expect(
        canvas.getByLabelText('2 Sessions need attention'),
      ).toBeVisible();
      await expect(viewport.getBoundingClientRect().width).toBe(frameWidth);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await expect(activeAnimation?.playState).not.toBe('idle');
      }
      await waitFor(() =>
        expect(
          viewport
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
