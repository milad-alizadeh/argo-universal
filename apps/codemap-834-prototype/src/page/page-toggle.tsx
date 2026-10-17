import type { CSSProperties, JSX } from 'react';
import { button } from '../code-map';
import type { Palette, View } from '../code-map';
import { togglePlate } from './page-styles';
import type { PrototypeState } from './prototype-state';

interface ToggleProps {
  state: PrototypeState;
  palette: Palette;
}

const modes: View[] = ['3d', 'flat'];

type ModeProps = ToggleProps & { mode: View };

const needsWebGL = ({ mode, state }: ModeProps): boolean =>
  mode === '3d' && !state.can3d;

function modeStyle(props: ModeProps): CSSProperties {
  const { mode, state, palette } = props;

  const base = {
    ...button(palette),
    background: mode === state.view ? palette.muted : palette.card,
  };

  return needsWebGL(props) ? { ...base, color: palette.mutedForeground } : base;
}

function ModeButton(props: ModeProps): JSX.Element {
  const { mode, state } = props;
  const disabled = needsWebGL(props);

  return (
    <button
      style={modeStyle(props)}
      aria-pressed={mode === state.view}
      disabled={disabled}
      title={disabled ? '3D needs WebGL' : undefined}
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
