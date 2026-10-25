import {
  Action,
  Canvas,
  Screen,
  Stack,
  Text,
  useState,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import {
  grid,
  days,
  areas,
  sceneProps,
  rectangles,
  dayProps,
  fileProps,
  areaLabel,
} from './canvas-data';

type Scene = { selected: string; onSelect: (key: string) => void };

function Heatmap({
  selected,
  onSelect,
  intensity,
}: Scene & { intensity: number }): JSX.Element {
  const props = sceneProps('Build activity', selected);

  return (
    <Canvas {...props}>
      {days.map((day) => (
        <Canvas.Rect key={day.key} {...dayProps(day, intensity, onSelect)} />
      ))}
    </Canvas>
  );
}

function CodeMap({ selected, onSelect }: Scene): JSX.Element {
  const props = sceneProps('Project files', selected);

  return (
    <Canvas {...props}>
      {rectangles.map((file) => (
        <Canvas.Rect key={file.key} {...fileProps(file, onSelect)} />
      ))}
      {areas.map((area) => (
        <Canvas.Text key={area.key + '-label'} {...areaLabel(area)} />
      ))}
    </Canvas>
  );
}

export function HelloCanvasPage(): JSX.Element {
  const [intensity, setIntensity] = useState(grid.half);

  const onPress = (): void =>
    setIntensity(intensity === grid.half ? 1 : grid.half);

  const props = { title: 'Canvas', primaryAction: changeAction(onPress) };

  return (
    <Screen {...props}>
      <CanvasExamples intensity={intensity} />
    </Screen>
  );
}

function changeAction(onPress: () => void): JSX.Element {
  const props: PluginProps['Action'] = {
    label: 'Change one shape',
    icon: 'add',
    onPress,
  };

  return <Action key="change" {...props} />;
}

function CanvasExamples({ intensity }: { intensity: number }): JSX.Element {
  const [day, setDay] = useState('');
  const [file, setFile] = useState('packages-0');

  return (
    <Stack direction="column" gap={4}>
      <Text>Build activity</Text>
      <Heatmap selected={day} onSelect={setDay} intensity={intensity} />
      <Text>Project files</Text>
      <CodeMap selected={file} onSelect={setFile} />
    </Stack>
  );
}
