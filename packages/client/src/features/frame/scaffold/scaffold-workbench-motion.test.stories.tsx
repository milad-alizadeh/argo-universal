import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { sampleMotionFrames } from './scaffold-workbench-motion.test.mocks';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/WorkbenchMotion',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  args: { inspectorOpen: true },
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

// Includes the settled destination after the Frame's 250ms transition.
const motionFrames = 24;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

async function assertSliding(canvas: Canvas, action: string): Promise<void> {
  const workbench = await canvas.findByTestId(workbenchId);
  const button = canvas.getByRole('button', { name: action });
  const left = (): number => workbench.getBoundingClientRect().left;
  const start = left();

  const positions = await sampleMotionFrames(
    () => button.click(),
    left,
    motionFrames,
  );

  await expect(positions.at(-1)).not.toBe(start);
  await expect(new Set(positions.map(Math.round)).size).toBeGreaterThan(2);
  await expect(canvas.getByTestId(workbenchId)).toBe(workbench);
  await expect(workbench).toBeVisible();
}

function closesAt(width: number): Story {
  return {
    beforeEach: (): Promise<void> => settleLayout(width),
    play: async ({ canvas }) => assertSliding(canvas, 'Hide Inspector'),
  };
}

export const DockedWorkbenchSlidesWhenTheInspectorCloses: Story =
  closesAt(1920);

export const AutoHiddenWorkbenchSlidesWhenTheInspectorCloses: Story =
  closesAt(1440);

export const WorkbenchSlidesWhenTheExpandedInspectorRestores: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Expand Inspector' }),
    );
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await assertSliding(canvas, 'Restore Inspector');
  },
};
