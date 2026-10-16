import { Text } from '@repo/client/text';
import type { JSX } from 'react';
import { source, type FileEntry, type Palette } from './model';
import type { PrototypeState } from './prototype-state';
import { hidden, diagnosticStyle } from './shell-styles';

export function Header({ state }: { state: PrototypeState }): JSX.Element {
  return (
    <Text>
      PROTOTYPE #834 · argo-universal · {state.files.length.toLocaleString()}{' '}
      files{' '}
      {state.count
        ? `(stress replicas of ${source.files.length} real files)`
        : ''}
    </Text>
  );
}

export function Footer({ state }: { state: PrototypeState }): JSX.Element {
  const instructions =
    state.view === '3d'
      ? 'Drag to orbit · right-drag to pan · wheel to zoom'
      : 'Drag to pan · wheel to zoom';

  return (
    <Text>
      {instructions} · {state.labels.length} visible labels ·{' '}
      {state.selected ? `onSelect: ${state.selected}` : 'Select a file'}
    </Text>
  );
}

function FileOption({ file }: { file: FileEntry }): JSX.Element {
  return <option value={file.id}>{file.path}</option>;
}

function FileSelect({ state }: { state: PrototypeState }): JSX.Element {
  return (
    <select
      id="codemap-files"
      aria-label="Code Map files"
      value={state.selected ?? ''}
      onChange={(event) => state.onSelect(event.target.value)}
    >
      <option value="">Select a file</option>
      {state.files.map((file) => (
        <FileOption key={file.id} file={file} />
      ))}
    </select>
  );
}

export function FileSelector({
  state,
}: {
  state: PrototypeState;
}): JSX.Element {
  return (
    <div style={hidden}>
      <label htmlFor="codemap-files">
        Accessible file list <FileSelect state={state} />
      </label>
    </div>
  );
}

interface DiagnosticProps {
  state: PrototypeState;
  palette: Palette;
}

export function Diagnostics({ state, palette }: DiagnosticProps): JSX.Element {
  return (
    <output style={diagnosticStyle(palette)}>
      {JSON.stringify(state.info ?? {})}
    </output>
  );
}
