import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import {
  ancestorsOf,
  boxOf,
  clipBox,
  intersection,
  isBackdropRoot,
  isInside,
  sampleMotion,
  shownBox,
} from './scaffold-inspector-motion.test.mocks';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/InspectorMotion',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  // Beside the open Inspector the page is too narrow for the Workbench's gutter.
  beforeEach: (): Promise<void> => settleLayout(1856),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const workbenchId = 'desktop-workbench';

interface InspectorMotionParts {
  workbench: HTMLElement;
  glass: HTMLElement;
  content: HTMLElement;
}

function parts(canvas: Canvas): InspectorMotionParts {
  const glass = canvas.getByTestId('inspector-glass');

  const content = glass.nextElementSibling;

  if (!(content instanceof HTMLElement))
    throw new Error('The Inspector glass needs its content beside it.');

  return { workbench: canvas.getByTestId(workbenchId), glass, content };
}

/*
 * At every step of the motion: the Workbench shows nowhere over the glass, and the content shows only inside it. The
 * Workbench's shown box is its own box inside every ancestor that clips it, so the check holds however it is hidden.
 */
async function assertNothingOverTheGlass(
  canvas: Canvas,
  action: string,
): Promise<void> {
  const { workbench, glass, content } = parts(canvas);

  // Whatever hides the Workbench must not make an ancestor a backdrop root, which would flatten its glass.
  await expect(ancestorsOf(workbench).filter(isBackdropRoot)).toEqual([]);

  const button = canvas.getByRole('button', { name: action });
  let frames = 0;

  const motion = await sampleMotion(
    () => button.click(),
    [workbench, glass, content, ...ancestorsOf(workbench)],
    async () => {
      frames += 1;
      const shown = shownBox(workbench);
      const over = shown && intersection(shown, boxOf(glass));
      await expect(
        over,
        `Workbench over the glass at step ${frames}`,
      ).toBeUndefined();

      await expect(
        isInside(clipBox(content), boxOf(glass)),
        `Content outside the glass at step ${frames}`,
      ).toBe(true);
    },
  );

  await expect(motion).toBeGreaterThan(0);
}

export const WorkbenchStaysOffTheGlassAsTheInspectorOpens: Story = {
  args: { inspectorOpen: false, initialWorkbenchIntent: 'shown' },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await assertNothingOverTheGlass(canvas, 'Show Inspector');
  },
};

export const WorkbenchStaysOffTheGlassAsTheInspectorCloses: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'auto' },
  beforeEach: (): Promise<void> => settleLayout(2560),
  play: async ({ canvas }) => {
    await assertNothingOverTheGlass(canvas, 'Hide Inspector');
  },
};

export const WorkbenchStaysOffTheGlassWhenToggledBesideTheInspector: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'auto' },
  play: async ({ canvas }) => {
    await assertNothingOverTheGlass(canvas, 'Toggle Workbench');
  },
};

export const WorkbenchStaysOffTheGlassAsTheExpandedInspectorOpensAndRestores: Story =
  {
    args: { inspectorOpen: true, initialWorkbenchIntent: 'shown' },
    beforeEach: (): Promise<void> => settleLayout(2560),
    play: async ({ canvas }) => {
      await assertNothingOverTheGlass(canvas, 'Expand Inspector');
      await assertNothingOverTheGlass(canvas, 'Restore Inspector');
    },
  };

// A resize moves the Inspector at once, and the Workbench's edge goes with it.
export const WorkbenchEdgeFollowsTheInspectorAcrossAResize: Story = {
  args: { inspectorOpen: true, initialWorkbenchIntent: 'auto' },
  play: async ({ canvas }) => {
    const { glass } = parts(canvas);
    const clip = canvas.getByTestId('workbench-clip');

    for (const width of [2200, 1856]) {
      await settleLayout(width);
      await waitFor(() =>
        expect(
          Math.abs(boxOf(clip).right - boxOf(glass).left),
        ).toBeLessThanOrEqual(1),
      );
    }
  },
};

// The clip passes the Workbench's pointer: its card takes the press.
export const WorkbenchCardTakesAPressInsideItsClip: Story = {
  args: { inspectorOpen: false, initialWorkbenchIntent: 'shown' },
  play: async ({ canvas }) => {
    const card = await canvas.findByRole('button', { name: 'Changes' });
    await browserUser.click(card);
    await waitFor(() =>
      expect(canvas.getByTestId('inspector-glass')).toBeVisible(),
    );
    await expect(
      canvas.getByRole('button', { name: 'Hide Inspector' }),
    ).toBeVisible();
  },
};
