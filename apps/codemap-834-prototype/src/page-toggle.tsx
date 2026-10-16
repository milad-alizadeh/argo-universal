import type { CSSProperties, JSX } from 'react';
import { button } from './map-styles';
import type { Palette, View } from './model';
import { togglePlate } from './page-styles';
import type { PrototypeState } from './prototype-state';

interface ToggleProps {
  state: PrototypeState;
  palette: Palette;
}

const modes: View[] = ['3d', 'flat'];

type ModeProps = ToggleProps & { mode: View };

function modeStyle({ mode, state, palette }: ModeProps): CSSProperties {
  return {
    ...button(palette),
    background: mode === state.view ? palette.muted : palette.card,
  };
}

function ModeButton(props: ModeProps): JSX.Element {
  const { mode, state } = props;

  return (
    <button
      style={modeStyle(props)}
      aria-pressed={mode === state.view}
      onClick={() => state.onView(mode)}
    >
      {mode === '3d' ? '3D' : 'Flat'}
    </button>
  );
}

export function ViewToggle(props: ToggleProps): JSX.Element {
  return (
    <div style={togglePlate(props.palette)}>
      {modes.map((mode) => (
        <ModeButton key={mode} mode={mode} {...props} />
      ))}
    </div>
  );
}
