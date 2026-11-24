import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import {
  clipBox,
  glassBox,
  intersection,
  isInside,
  sampleMotion,
  shownWorkbench,
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
  clip: HTMLElement;
  glass: HTMLElement;
  content: HTMLElement;
}

function parts(canvas: Canvas): InspectorMotionParts {
  const glass = canvas.getByTestId('inspector-glass');

  const content = glass.nextElementSibling;

  if (!(content instanceof HTMLElement))
    throw new Error('The Inspector glass needs its content beside it.');

  return {
    workbench: canvas.getByTestId(workbenchId),
    clip: canvas.getByTestId('workbench-clip'),
    glass,
    content,
  };
}

// At every step of the motion: the Workbench shows nowhere over the glass, and the content shows only inside it.
async function assertNothingOverTheGlass(
  canvas: Canvas,
  action: string,
): Promise<void> {
  const { workbench, clip, glass, content: inspector } = parts(canvas);

  // The clip is an overflow clip alone: these would make it a backdrop root and flatten the Workbench's glass.
  const { clipPath, mask, filter, backdropFilter } = getComputedStyle(clip);
  await expect([clipPath, mask, filter, backdropFilter]).toEqual(
    Array(4).fill('none'),
  );

  const button = canvas.getByRole('button', { name: action });
  let frames = 0;

  const motion = await sampleMotion(
    () => button.click(),
    [workbench, clip, glass, inspector],
    async () => {
      frames += 1;
      const shown = shownWorkbench(workbench, clip);
      const over = shown && intersection(shown, glassBox(glass));
      await expect(
        over,
        `Workbench over the glass at step ${frames}`,
      ).toBeUndefined();

      await expect(
        isInside(clipBox(inspector), glassBox(glass)),
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
