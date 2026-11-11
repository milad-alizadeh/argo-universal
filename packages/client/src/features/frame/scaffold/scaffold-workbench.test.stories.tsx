import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Workbench',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

const toggleLabel = 'Toggle Workbench';

const buttonRole = 'button';

const draftLabel = 'Draft';

const detailId = 'desktop-detail';

const textboxRole = 'textbox';

const draftText = 'Keep my draft';

const pressedAttribute = 'aria-pressed';

export const ClosedInspectorGripKeepsTheWindowEdgeReachable: Story = {
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas, userEvent }) => {
    const divider = canvas.getByRole('separator', { name: 'Resize Inspector' });
    const start = divider.getBoundingClientRect();
    const frame = canvas.getByTestId('wide-frame').getBoundingClientRect();
    await expect(start.right).toBe(frame.right);

    const point = {
      clientX: start.left + start.width / 2,
      clientY: start.top + 100,
    };

    await expect(document.elementFromPoint(point.clientX, point.clientY)).toBe(
      divider,
    );
    await userEvent.pointer([
      { target: divider, coords: point, keys: '[MouseLeft>]' },
      { target: divider, coords: { ...point, clientX: point.clientX - 240 } },
      { keys: '[/MouseLeft]' },
    ]);
    const inspector = canvas.getByTestId('desktop-inspector');
    await waitFor(() =>
      expect(inspector.getBoundingClientRect().width).toBe(352),
    );
    const width = inspector.getBoundingClientRect().width;
    divider.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(inspector.getBoundingClientRect().width).toBeGreaterThan(width),
    );
    await expect(divider).toHaveFocus();
  },
};

export const ShowOverlaysTheContentAndKeepsTheDraftMounted: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const feed = await canvas.findByTestId('workbench-feed');
    const draft = canvas.getByRole(textboxRole, { name: draftLabel });
    const page = canvas.getByTestId(detailId);
    const width = page.getBoundingClientRect().width;
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await userEvent.click(canvas.getByRole(buttonRole, { name: toggleLabel }));
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(
      canvas.getByRole(buttonRole, { name: toggleLabel }),
    ).toHaveAttribute(pressedAttribute, 'true');
    await expect(page).not.toHaveAttribute('inert');
    await expect(feed).toBeVisible();
    await expect(page.getBoundingClientRect().width).toBe(width);
    await expect(canvas.getByRole(textboxRole, { name: draftLabel })).toBe(
      draft,
    );

    const inspector = canvas
      .getByTestId('desktop-inspector')
      .getBoundingClientRect();

    await waitFor(() => {
      const workbench = canvas.getByTestId(workbenchId).getBoundingClientRect();
      void expect(workbench.right).toBeLessThanOrEqual(inspector.left);
      void expect(workbench.left).toBeGreaterThan(
        page.getBoundingClientRect().left,
      );
    });

    await userEvent.click(canvas.getByRole(buttonRole, { name: toggleLabel }));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(draft).toHaveValue(draftText);
  },
};

export const NarrowingAutoHidesTheGutterWorkbench: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas }) => {
    await settleLayout(2224);
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await settleLayout('wide');
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
  },
};

export const ShownIntentReturnsToTheGutter: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas }) => {
    const draft = await canvas.findByLabelText(draftLabel);
    await expect(canvas.getByTestId(detailId)).not.toHaveAttribute('inert');
    await settleLayout(2224);
    await browserUser.hover(draft);
    await expect(canvas.getByRole(textboxRole, { name: draftLabel })).toBe(
      draft,
    );
    await expect(draft).toHaveValue(draftText);
    await expect(canvas.getByTestId(workbenchId)).toBeVisible();
    await expect(
      canvas.getByRole(buttonRole, { name: toggleLabel }),
    ).toHaveAttribute(pressedAttribute, 'true');
  },
};

export const HiddenIntentSurvivesNarrowingAndWidening: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'hidden' },
  beforeEach: (): Promise<void> => settleLayout(1768),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId(workbenchId)).not.toBeVisible();
    await settleLayout('wide');
    await settleLayout(1768);
    await expect(canvas.getByTestId(workbenchId)).not.toBeVisible();
    await expect(
      canvas.getByRole(buttonRole, { name: toggleLabel }),
    ).toHaveAttribute(pressedAttribute, 'false');
    await expect(
      canvas.getByRole(textboxRole, { name: draftLabel }),
    ).toHaveValue(draftText);
  },
};

export const CardOpensTheInspectorWithoutClosingTheOverview: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1920);
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await userEvent.click(canvas.getByRole(buttonRole, { name: 'Changes' }));
    await expect(await canvas.findByText('Branch files')).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
  },
};

export const OverflowCardsKeepTheirOwnScrollTarget: Story = {
  args: { overflowing: true },
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByRole('region', {
      name: 'Workbench overview',
    });

    const card = canvas.getByRole(buttonRole, { name: 'Section 1' });
    await browserUser.hover(card);

    const box = card.getBoundingClientRect();
    await cdp().send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      deltaX: 0,
      deltaY: 300,
    });
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
  },
};
