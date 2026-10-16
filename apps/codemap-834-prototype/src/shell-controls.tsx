import type { JSX, CSSProperties } from 'react';
import type { CameraAction, Palette, View } from './model';
import type { PrototypeState } from './prototype-state';
import { button, cameraPlate, togglePlate } from './shell-styles';

interface ControlProps {
  state: PrototypeState;
  palette: Palette;
}

const modes: View[] = ['3d', 'flat'];

const actions: { action: CameraAction; label: string; name: string }[] = [
  { action: 'in', label: '+', name: 'Zoom in' },
  { action: 'out', label: '−', name: 'Zoom out' },
  { action: 'fit', label: 'Fit', name: 'Fit' },
];

type ModeProps = ControlProps & { mode: View };

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

export function ViewToggle(props: ControlProps): JSX.Element {
  return (
    <div style={togglePlate(props.palette)}>
      {modes.map((mode) => (
        <ModeButton key={mode} mode={mode} {...props} />
      ))}
    </div>
  );
}

type Action = (typeof actions)[number];

type CameraButtonProps = ControlProps & Action;

function CameraButton(props: CameraButtonProps): JSX.Element {
  const { state, palette, action, label, name } = props;

  return (
    <button
      aria-label={name}
      style={button(palette)}
      onClick={() => state.onCamera(action)}
    >
      {label}
    </button>
  );
}

export function CameraControls(props: ControlProps): JSX.Element {
  return (
    <div style={cameraPlate(props.palette)}>
      {actions.map((action) => (
        <CameraButton key={action.action} {...props} {...action} />
      ))}
    </div>
  );
}
