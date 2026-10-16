import type { CSSProperties } from 'react';
import type { Label } from './labels/map-labels';
import type { Palette } from './model';

/** Code Map plates and buttons; the prototype page's own plates reuse them. */
export function button(palette: Palette): CSSProperties {
  return {
    border: 0,
    borderRadius: 10,
    padding: '7px 12px',
    color: palette.foreground,
    background: palette.card,
    cursor: 'pointer',
    font: 'inherit',
  };
}

export function plate(palette: Palette): CSSProperties {
  return {
    background: palette.card,
    border: `1px solid ${palette.border}`,
    borderRadius: 10,
    padding: 5,
    position: 'absolute',
  };
}

export function labelCard(label: Label, palette: Palette): CSSProperties {
  return {
    position: 'absolute',
    left: label.x,
    top: label.y,
    maxWidth: label.maxWidth,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    background: palette.card,
    borderRadius: 4,
    padding: '1px 5px',
  };
}

/** The Code Map fills the box its parent gives it; the canvas and overlay share that box. */
export const fill: CSSProperties = { position: 'absolute', inset: 0 };

export const overlay: CSSProperties = { ...fill, pointerEvents: 'none' };

export const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
};

export function cameraPlate(palette: Palette): CSSProperties {
  return { ...plate(palette), right: 12, bottom: 12, display: 'grid' };
}
