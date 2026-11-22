import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  declaredRegions,
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
  decorators: [
    (Story): ReactElement => (
      <View className="w-full max-w-lg self-center">
        <Story />
      </View>
    ),
  ],
  argTypes: { steps: { control: false } },
  args: { steps: draftSteps, shown: drawnSkeleton, regions: declaredRegions },
} satisfies Meta<typeof DraftSteps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Skeleton: Story = {};

export const DrawingHeader: Story = { args: { shown: drawingHeader } };

export const DrawingList: Story = { args: { shown: drawingList } };

export const Landed: Story = { args: { shown: landed } };
