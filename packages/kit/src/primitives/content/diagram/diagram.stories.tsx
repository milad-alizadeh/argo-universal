import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  flowchartDiagram,
  sequenceDiagram,
  streamingDiagram,
  tallDiagram,
  unsupportedDiagram,
} from './diagram-fixtures';
import { Diagram } from './index';

const meta = {
  title: 'Design System/Primitives/Content/Diagram',
  component: Diagram,
  argTypes: {
    source: { control: 'text' },
    pending: { control: 'boolean' },
  },
} satisfies Meta<typeof Diagram>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nodes marked `success` and `danger` take those tones; every other colour is the theme's.
export const Flowchart: Story = { args: flowchartDiagram };

export const Sequence: Story = { args: sequenceDiagram };

// Taller than the cap: scaled down to fit, and full size in the full-screen view.
export const Tall: Story = { args: tallDiagram };

// While the fence streams: a 16:9 placeholder under the title it has so far.
export const Streaming: Story = { args: streamingDiagram };

// A kind Argo cannot draw shows its code and says so.
export const Unsupported: Story = { args: unsupportedDiagram };
