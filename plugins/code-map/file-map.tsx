import {
  Canvas,
  FieldGroup,
  Label,
  Stack,
  Text,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { layout, mapExtent } from './layout/treemap';
import type { CodeFile } from './model';
import { historyCommits } from './project-files';
import {
  drawnFiles,
  fileCaptions,
  fileRects,
  type DrawnFiles,
  type FileCaption,
  type FileRect,
} from './scene';

const count = (value: number): string => value.toLocaleString('en');

const legend = `Area: lines · Colour: branching lines · Shade: changes in the last ${count(historyCommits)} commits`;

// What a page draws of the Project's files.
interface Scene {
  drawn: DrawnFiles;
  rects: FileRect[];
  captions: FileCaption[];
}

// Laid out once per draw.
function sceneOf(files: CodeFile[]): Scene {
  const drawn = drawnFiles(files);
  const tiles = layout(drawn.files);

  return { drawn, rects: fileRects(tiles), captions: fileCaptions(tiles) };
}

/*
 * A press selects a file by its rectangle's short key, a Page state change, so the page draws again with that file's
 * details. The key, not the path, keeps each rectangle's press small enough for 2,500 of them on one page.
 */
type Select = (key: string) => ReturnType<PageTo['set']>;

type FileMapProps = { files: CodeFile[]; selected: string; onSelect: Select };

// The App owns pan, zoom and the selection outline; the page's Page state keeps which file is selected.
export function FileMap({
  files,
  selected,
  onSelect,
}: FileMapProps): JSX.Element {
  const scene = sceneOf(files);
  const rect = scene.rects.find(({ key }) => key === selected);

  return (
    <Stack direction="column" gap={4}>
      <MapCanvas {...scene} selected={rect?.key} onSelect={onSelect} />
      <MapNotes drawn={scene.drawn} total={files.length} />
      <FileDetails file={files.find(({ path }) => path === rect?.path)} />
    </Stack>
  );
}

type MapCanvasProps = Pick<Scene, 'rects' | 'captions'> & {
  selected: string | undefined;
  onSelect: Select;
};

// The scene's own units; the App scales it to fit and owns the camera.
const frame: Omit<PluginProps['Canvas'], 'selectedKey'> = {
  label: 'Code Map',
  width: mapExtent.w,
  height: mapExtent.h,
  aspectRatio: mapExtent.w / mapExtent.h,
  camera: 'pan-zoom',
};

// Each file's rectangle selects it when pressed; captions sit over the largest.
function MapCanvas(props: MapCanvasProps): JSX.Element {
  return (
    <Canvas {...frame} selectedKey={props.selected}>
      {props.rects.map(({ key, path: _path, ...rect }) => (
        <Canvas.Rect key={key} {...rect} onPress={props.onSelect(key)} />
      ))}
      {props.captions.map(({ key, file: _file, ...caption }) => (
        <Canvas.Text key={key} {...caption} />
      ))}
    </Canvas>
  );
}

// What the map's area, colour and shade mean, and how many files it left out.
function MapNotes(props: { drawn: DrawnFiles; total: number }): JSX.Element {
  const hidden = `Showing the ${count(props.drawn.files.length)} largest of ${count(props.total)} files.`;

  return (
    <Stack direction="column" gap={1}>
      <Text role="secondary" tone="muted">
        {legend}
      </Text>
      {props.drawn.hidden > 0 ? (
        <Text role="secondary" tone="muted">
          {hidden}
        </Text>
      ) : null}
    </Stack>
  );
}

// A Label as the value keeps the details read-only properties under the map, not a page of settings rows.
function FileCount(props: { title: string; count: number }): JSX.Element {
  return (
    <FieldGroup.Value title={props.title}>
      <Label text={count(props.count)} />
    </FieldGroup.Value>
  );
}

const fileCounts = (file: CodeFile): JSX.Element[] => [
  <FileCount key="lines" title="Lines" count={file.lines} />,
  <FileCount key="branches" title="Branching lines" count={file.branches} />,
  <FileCount key="touches" title="Changes" count={file.touches} />,
];

function FileDetails({
  file,
}: {
  file: CodeFile | undefined;
}): JSX.Element | null {
  if (!file) return null;

  return (
    <FieldGroup>
      <FieldGroup.Section title={file.path}>
        {fileCounts(file)}
      </FieldGroup.Section>
    </FieldGroup>
  );
}
