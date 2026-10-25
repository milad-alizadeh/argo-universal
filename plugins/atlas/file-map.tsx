import {
  Canvas,
  Metadata,
  Stack,
  useMemo,
  useState,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { layout, mapExtent } from './layout/treemap';
import { MapNotes } from './map-notes';
import type { CodeFile } from './model';
import { count } from './notes';
import type { FileAnswers } from './project-files';
import {
  drawnFiles,
  fileCaptions,
  fileRects,
  type DrawnFiles,
  type FileCaption,
  type FileRect,
} from './scene';

// What a page draws of the Project's files.
interface Scene {
  drawn: DrawnFiles;
  rects: FileRect[];
  captions: FileCaption[];
}

// Laid out once per answer.
function useScene(files: CodeFile[]): Scene {
  const drawn = useMemo(() => drawnFiles(files), [files]);
  const tiles = useMemo(() => layout(drawn.files), [drawn]);
  const rects = useMemo(() => fileRects(tiles), [tiles]);
  const captions = useMemo(() => fileCaptions(tiles), [tiles]);

  return { drawn, rects, captions };
}

interface FileMapProps {
  files: CodeFile[];
  answers: FileAnswers;
}

// The App owns pan, zoom and the selection outline; the Plugin keeps which file is selected.
export function FileMap({ files, answers }: FileMapProps): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  const scene = useScene(files);
  const selectedKey = scene.rects.find(({ path }) => path === selected)?.key;

  return (
    <Stack direction="column" gap={4}>
      <MapCanvas {...scene} selected={selectedKey} onSelect={setSelected} />
      <MapNotes drawn={scene.drawn} answers={answers} />
      <FileDetails file={files.find(({ path }) => path === selected)} />
    </Stack>
  );
}

type MapCanvasProps = Pick<Scene, 'rects' | 'captions'> & {
  selected: string | undefined;
  onSelect: (path: string) => void;
};

// The scene's own units; the App scales it to fit and owns the camera.
const frame: Omit<PluginProps['Canvas'], 'selectedKey'> = {
  label: 'Code Map',
  width: mapExtent.w,
  height: mapExtent.h,
  camera: 'pan-zoom',
};

// Each file's rectangle selects it when pressed; captions sit over the largest.
function MapCanvas(props: MapCanvasProps): JSX.Element {
  return (
    <Canvas {...frame} selectedKey={props.selected}>
      {props.rects.map(({ key, path, ...rect }) => (
        <Canvas.Rect key={key} {...rect} onPress={() => props.onSelect(path)} />
      ))}
      {props.captions.map(({ key, ...caption }) => (
        <Canvas.Text key={key} {...caption} />
      ))}
    </Canvas>
  );
}

function FileDetails({
  file,
}: {
  file: CodeFile | undefined;
}): JSX.Element | null {
  if (!file) return null;

  return (
    <Metadata title={file.path}>
      <Metadata.Label title="Lines" text={count(file.lines)} />
      <Metadata.Label title="Branching lines" text={count(file.branches)} />
      <Metadata.Label title="Changes" text={count(file.touches)} />
    </Metadata>
  );
}
