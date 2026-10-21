import { sampleEachFrame } from '@repo/kit/mocks/sample-each-frame';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/WorkbenchMotion',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
  args: { stageOpen: true },
  beforeEach: (): Promise<void> => settleViewport(1920),
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

  const positions = await sampleEachFrame(
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
    beforeEach: (): Promise<void> => settleViewport(width),
    play: async ({ canvas }) => assertSliding(canvas, 'Hide Stage'),
  };
}

export const DockedWorkbenchSlidesWhenStageCloses: Story = closesAt(1920);

export const AutoHiddenWorkbenchSlidesWhenStageCloses: Story = closesAt(1440);

export const WorkbenchSlidesWhenExpandedStageRestores: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Expand Stage' }));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await assertSliding(canvas, 'Restore Stage');
  },
};
