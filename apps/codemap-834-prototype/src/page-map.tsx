import { Text } from '@repo/client/text';
import type { JSX } from 'react';
import { CodeMap } from './code-map';
import type { Palette } from './model';
import { map, measurePlate, selectionPlate } from './page-styles';
import { ViewToggle } from './page-toggle';
import type { PrototypeState } from './prototype-state';

interface Props {
  state: PrototypeState;
  palette: Palette;
}

function Scale({ palette }: { palette: Palette }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[palette.border, palette.warning, palette.danger].map((color) => (
        <span key={color} style={{ height: 5, background: color, flex: 1 }} />
      ))}
    </div>
  );
}

function Measures({ state, palette }: Props): JSX.Element {
  return (
    <div style={measurePlate(palette)}>
      <div>Area　 Lines of code</div>
      {state.view === '3d' && <div>Height　 Recent commits</div>}
      <div>Colour　 Lexical branches</div>
      <Scale palette={palette} />
      <div style={{ fontSize: 12, color: palette.mutedForeground }}>
        Up to 8　　 9–19　　 20 and up
      </div>
    </div>
  );
}

function Selection({ state, palette }: Props): JSX.Element | null {
  if (!state.selectedId) return null;

  return (
    <div style={selectionPlate(palette)}>
      <Text>{state.selectedId}</Text>
    </div>
  );
}

function ProjectMap({ state }: { state: PrototypeState }): JSX.Element {
  const { view, files, selectedId, onSelect } = state;

  return (
    <CodeMap
      label="argo-universal"
      view={view}
      files={files}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}

/** The prototype page around the Code Map: its view toggle, legend and selected file sit over the map. */
export function MapArea(props: Props): JSX.Element {
  return (
    <div style={map(props.palette)}>
      <ViewToggle {...props} />
      <ProjectMap state={props.state} />
      <Measures {...props} />
      <Selection {...props} />
    </div>
  );
}
