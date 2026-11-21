import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  draftSteps,
  drawingHeader,
  drawingList,
  drawnSkeleton,
  landed,
} from './draft-drawing-fixtures';
import { DraftSteps } from './draft-drawing.mocks';

const meta = {
  title: 'Design System/Patterns/DraftDrawing',
  component: DraftSteps,
  parameters: { screenPreview: true },
  argTypes: { steps: { control: false } },
  args: { steps: draftSteps, shown: drawnSkeleton },
} satisfies Meta<typeof DraftSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

// The keyed skeleton the Agent wrote first, with no region named yet.
export const Skeleton: Story = {};

// The Agent is writing the header: a labelled dashed frame stands round its skeleton.
export const DrawingHeader: Story = { args: { shown: drawingHeader } };

// The header landed and its new nodes faded in; the frame has moved to the list the Agent is writing.
export const DrawingList: Story = { args: { shown: drawingList } };

// The list landed: its new rows faded in and the frame dissolved.
export const Landed: Story = { args: { shown: landed } };
