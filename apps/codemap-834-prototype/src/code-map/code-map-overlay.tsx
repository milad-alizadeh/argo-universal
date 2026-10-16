import { Text } from '@repo/client/text';
import { useSyncExternalStore, type JSX, type RefObject } from 'react';
import type { Feed } from './feed';
import type { Label } from './labels/map-labels';
import type { CodeMapOverlay } from './map-overlay';
import { button, cameraPlate, hidden, labelCard, overlay } from './map-styles';
import type { CodeMapFile, Palette } from './model';
import {
  runCamera,
  type CameraAction,
  type Viewport,
} from './viewport/viewport';

function LabelCard(props: { label: Label; palette: Palette }): JSX.Element {
  return (
    <div style={labelCard(props.label, props.palette)}>
      <Text role="secondary" numberOfLines={1}>
        {props.label.text}
      </Text>
    </div>
  );
}

/** Kit text over the canvas; only this layer re-renders when the labels move. */
function LabelLayer(props: {
  labels: Feed<Label[]>;
  palette: Palette;
}): JSX.Element {
  const { labels, palette } = props;
  const placed = useSyncExternalStore(labels.subscribe, labels.current);

  return (
    <div style={overlay} aria-hidden="true">
      {placed.map((label) => (
        <LabelCard key={label.id} label={label} palette={palette} />
      ))}
    </div>
  );
}

const actions: { action: CameraAction; label: string; name: string }[] = [
  { action: 'in', label: '+', name: 'Zoom in' },
  { action: 'out', label: '−', name: 'Zoom out' },
  { action: 'fit', label: 'Fit', name: 'Fit' },
];

interface CameraProps {
  viewport: RefObject<Viewport | null>;
  palette: Palette;
}

type CameraButtonProps = CameraProps & (typeof actions)[number];

function CameraButton(props: CameraButtonProps): JSX.Element {
  const { viewport, palette, action, label, name } = props;

  return (
    <button
      aria-label={name}
      style={button(palette)}
      onClick={() => runCamera(viewport.current, action)}
    >
      {label}
    </button>
  );
}

function CameraControls(props: CameraProps): JSX.Element {
  return (
    <div style={cameraPlate(props.palette)} data-plate>
      {actions.map((action) => (
        <CameraButton key={action.action} {...props} {...action} />
      ))}
    </div>
  );
}

interface FileListProps {
  files: CodeMapFile[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

function FileOption({ file }: { file: CodeMapFile }): JSX.Element {
  return <option value={file.id}>{file.path}</option>;
}

function FileSelect(props: FileListProps): JSX.Element {
  return (
    <select
      id="codemap-files"
      aria-label="Code Map files"
      value={props.selectedId ?? ''}
      onChange={(event) => props.onSelect(event.target.value)}
    >
      <option value="">Select a file</option>
      {props.files.map((file) => (
        <FileOption key={file.id} file={file} />
      ))}
    </select>
  );
}

/** The canvas's text twin: it selects the same file ids as a press on the map. */
function FileList(props: FileListProps): JSX.Element {
  return (
    <div style={hidden}>
      <label htmlFor="codemap-files">
        Accessible file list <FileSelect {...props} />
      </label>
    </div>
  );
}

interface OverlayProps extends FileListProps {
  map: CodeMapOverlay;
  palette: Palette;
}

/** Everything laid over the canvas: labels, camera controls and the file list. */
export function Overlay(props: OverlayProps): JSX.Element {
  const { map, palette } = props;

  return (
    <>
      <LabelLayer labels={map.labels} palette={palette} />
      <CameraControls viewport={map.overlay.viewport} palette={palette} />
      <FileList {...props} />
    </>
  );
}
