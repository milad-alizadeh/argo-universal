import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { kitArgTypes } from '#kit/kit-arg-types';
import { Canvas } from './canvas';
import { CanvasFallback } from './canvas-boundary';
import type { RectProps } from './canvas-props';
import { days, rectangles, labels } from './canvas.stories.mocks';

const meta = {
  title: 'Design System/Primitives/Visual/Canvas',
  component: Canvas,
  argTypes: kitArgTypes('Canvas'),
  // The scenes are drawn at a fixed width, as they sit in a product layout.
  decorators: [
    (Story): React.JSX.Element => (
      <View style={{ width: 360, maxWidth: '100%' }}>
        <Story />
      </View>
    ),
  ],
} satisfies Meta<typeof Canvas>;

export default meta;

// Every scene composes its own children, so stories type against the component, not meta's args.
type Story = StoryObj<typeof Canvas>;

const scenes = {
  heatmap: {
    label: 'Build activity',
    width: 360,
    height: 216,
    camera: 'pan-zoom',
  },
  files: {
    label: 'Files',
    width: 360,
    height: 216,
    camera: 'pan-zoom',
  },
} as const;

// Each scene draws Canvas children and tracks its own selection, so it keeps a render.
function HeatmapScene(): React.JSX.Element {
  const [selectedKey, select] = useState('day-44');

  return (
    <Canvas {...scenes.heatmap} selectedKey={selectedKey}>
      {days.map(({ key, ...day }) => (
        <Canvas.Rect {...day} key={key} onPress={() => select(key)} />
      ))}
    </Canvas>
  );
}

function CodeMapScene(): React.JSX.Element {
  const [selectedKey, select] = useState('packages-0');
  const props = { ...scenes.files, selectedKey };

  return (
    <Canvas {...props}>
      {rectangles.map((file) => (
        <Canvas.Rect key={file.key} {...selectable(file, select)} />
      ))}
      {labels.map(({ key, ...label }) => (
        <Canvas.Text {...label} key={key} />
      ))}
    </Canvas>
  );
}

function selectable(
  file: (typeof rectangles)[number],
  select: (key: string) => void,
): RectProps {
  const { key, ...props } = file;

  return { ...props, onPress: () => select(key) };
}

function Unavailable(): React.JSX.Element {
  return (
    <View className="bg-card" style={{ aspectRatio: 5 / 3 }}>
      <CanvasFallback label="Build activity" />
    </View>
  );
}

export const Heatmap: Story = {
  render: () => <HeatmapScene />,
  parameters: {
    docs: { description: { story: 'Rectangles the viewer can pan and zoom.' } },
  },
};

export const CodeMap: Story = {
  render: () => <CodeMapScene />,
  parameters: {
    docs: { description: { story: 'A flat map of rectangles and labels.' } },
  },
};

export const DrawingUnavailable: Story = {
  render: () => <Unavailable />,
  parameters: {
    docs: {
      description: { story: 'The fallback a failed drawing falls back to.' },
    },
  },
};
