import { Action, Canvas, Page, Stack, Text, useState } from '@argo/plugin-kit';
import {
  grid,
  days,
  areas,
  sceneProps,
  rectangles,
  dayProps,
  fileProps,
  areaLabel,
} from './canvas-data.js';

function Heatmap({ selected, onSelect, intensity }) {
  const props = sceneProps('Build activity', selected);

  return (
    <Canvas {...props}>
      {days.map((day) => (
        <Canvas.Rect key={day.key} {...dayProps(day, intensity, onSelect)} />
      ))}
    </Canvas>
  );
}

function CodeMap({ selected, onSelect }) {
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

export function HelloCanvasPage() {
  const [intensity, setIntensity] = useState(grid.half);
  const onPress = () => setIntensity(intensity === grid.half ? 1 : grid.half);
  const props = { title: 'Canvas', primaryAction: changeAction(onPress) };

  return (
    <Page {...props}>
      <CanvasExamples intensity={intensity} />
    </Page>
  );
}

function changeAction(onPress) {
  const props = { label: 'Change one shape', icon: 'add', onPress };

  return <Action key="change" {...props} />;
}

function CanvasExamples({ intensity }) {
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
