import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { View } from 'react-native';
import { Variation, Variations as VariationList } from '../../../variations';
import { Canvas } from './canvas';
import { CanvasFallback } from './canvas-boundary';
import type { RectProps } from './canvas-props';
import { days, rectangles, labels } from './canvas.stories.mocks';

const meta = {
  title: 'Design System/Primitives/Visual/Canvas',
  component: Canvas,
} satisfies Meta;

export default meta;

type Story = StoryObj;

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

function Heatmap(): React.JSX.Element {
  const [selectedKey, select] = useState('day-44');

  return (
    <Canvas {...scenes.heatmap} selectedKey={selectedKey}>
      {days.map(({ key, ...day }) => (
        <Canvas.Rect {...day} key={key} onPress={() => select(key)} />
      ))}
    </Canvas>
  );
}

function CodeMap(): React.JSX.Element {
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

export const Variations: Story = {
  name: 'Canvas',
  render: () => (
    <View style={{ width: 360, maxWidth: '100%' }}>
      <VariationList>
        <Variation label="Heatmap · pan and zoom">
          <Heatmap />
        </Variation>
        <Variation label="Atlas · flat code map">
          <CodeMap />
        </Variation>
        <Variation label="Drawing unavailable">
          <Unavailable />
        </Variation>
      </VariationList>
    </View>
  ),
};

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
