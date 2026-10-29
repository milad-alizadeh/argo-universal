import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import { sampleMotionFrames } from './scaffold-workbench-motion.test.mocks';
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

export const DedicatedViewKeepsTheDraftMounted: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const feed = await canvas.findByTestId('workbench-feed');
    const draft = canvas.getByRole(textboxRole, { name: draftLabel });
    const page = canvas.getByTestId(detailId);
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(
      canvas.getByRole(buttonRole, { name: toggleLabel }),
    ).toHaveAttribute(pressedAttribute, 'false');
    await userEvent.click(canvas.getByRole(buttonRole, { name: toggleLabel }));
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(
      canvas.getByRole(buttonRole, { name: toggleLabel }),
    ).toHaveAttribute(pressedAttribute, 'true');
    await expect(page).toHaveAttribute('aria-hidden', 'true');
    await expect(page).toHaveAttribute('inert');
    await expect(
      canvas.queryByRole(textboxRole, { name: draftLabel }),
    ).toBeNull();
    await expect(feed).not.toBeVisible();
    await expect(page.contains(document.activeElement)).toBe(false);
    const workbench = canvas.getByTestId(workbenchId).getBoundingClientRect();

    const inspector = canvas
      .getByTestId('desktop-inspector')
      .getBoundingClientRect();

    await expect(workbench.right).toBeLessThan(inspector.left);
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      canvas.queryByRole('separator', { name: 'Resize Workbench' }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole(buttonRole, { name: toggleLabel }));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(canvas.getByRole(textboxRole, { name: draftLabel })).toBe(
      draft,
    );
    await expect(draft).toHaveValue(draftText);
  },
};

export const NarrowingAutoHidesTheDockedWorkbench: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas }) => {
    await settleLayout(1768);
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await settleLayout('wide');
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
  },
};

export const DedicatedViewRestoresWithoutCrossingThePrimaryView: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas }) => {
    const workbench = await canvas.findByTestId(workbenchId);
    const draft = canvas.getByLabelText(draftLabel);
    const page = canvas.getByTestId(detailId);

    const overlaps = (): number =>
      Number(
        page.getBoundingClientRect().right >
          workbench.getBoundingClientRect().left,
      );

    const intersections = await sampleMotionFrames(
      () => canvas.getByRole(buttonRole, { name: 'Hide Inspector' }).click(),
      overlaps,
      24,
    );

    await expect(intersections).not.toContain(1);
    await expect(canvas.getByRole(textboxRole, { name: draftLabel })).toBe(
      draft,
    );
    await expect(draft).toHaveValue(draftText);
    await expect(workbench).toBeVisible();
  },
};

export const ShownIntentReturnsToItsSeparateRegion: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'shown' },
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas }) => {
    const draft = await canvas.findByLabelText(draftLabel);
    await expect(canvas.getByTestId(detailId)).toHaveAttribute('inert');
    await settleLayout(1768);
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
