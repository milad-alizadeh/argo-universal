import { Text } from '@repo/client/text';
import { Suspense, type JSX } from 'react';
import type { Label, Palette } from './model';
import type { PrototypeState } from './prototype-state';
import { FlatLoader, ThreeMap } from './renderer-loader.web';
import { CameraControls, ViewToggle } from './shell-controls';
import {
  labelCard,
  map,
  overlay,
  measurePlate,
  selectionPlate,
} from './shell-styles';

interface Props {
  state: PrototypeState;
  palette: Palette;
}

function LabelCard({
  label,
  palette,
}: {
  label: Label;
  palette: Palette;
}): JSX.Element {
  return (
    <div style={labelCard(label, palette)}>
      <Text role="secondary" numberOfLines={1}>
        {label.text}
      </Text>
    </div>
  );
}

function Labels({ state, palette }: Props): JSX.Element {
  return (
    <div style={overlay} aria-hidden="true">
      {state.labels.map((label) => (
        <LabelCard key={label.id} label={label} palette={palette} />
      ))}
    </div>
  );
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
  if (!state.selected) return null;

  return (
    <div style={selectionPlate(palette)}>
      <Text>{state.selected}</Text>
    </div>
  );
}

function Renderer({ state, palette }: Props): JSX.Element {
  if (state.view === '3d') return <ThreeMap {...state} palette={palette} />;

  return <FlatLoader {...state} palette={palette} />;
}

export function MapArea(props: Props): JSX.Element {
  return (
    <div style={map(props.palette)}>
      <Suspense fallback={<Text>Measuring argo-universal</Text>}>
        <Renderer {...props} />
      </Suspense>
      <ViewToggle {...props} />
      <Labels {...props} />
      <Measures {...props} />
      <CameraControls {...props} />
      <Selection {...props} />
    </div>
  );
}
