import type { CSSProperties } from 'react';
import type { Label, Palette } from './model';

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

export function main(palette: Palette): CSSProperties {
  return {
    height: '100vh',
    boxSizing: 'border-box',
    padding: 16,
    background: palette.muted,
    color: palette.foreground,
    fontFamily: 'system-ui',
    fontSize: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };
}

export function map(palette: Palette): CSSProperties {
  return {
    position: 'relative',
    flex: 1,
    minHeight: 400,
    borderRadius: 18,
    overflow: 'hidden',
    background: palette.card,
    border: `1px solid ${palette.border}`,
  };
}

export function labelCard(label: Label, palette: Palette): CSSProperties {
  return {
    position: 'absolute',
    left: label.x,
    top: label.y,
    maxWidth: 200,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    background: palette.card,
    borderRadius: 4,
    padding: '1px 5px',
  };
}

export const overlay: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

export const hidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
};

export function togglePlate(palette: Palette): CSSProperties {
  return { ...plate(palette), left: 12, top: 12, display: 'flex', gap: 4 };
}

export function measurePlate(palette: Palette): CSSProperties {
  return {
    ...plate(palette),
    bottom: 12,
    left: 12,
    width: 222,
    padding: 10,
    display: 'grid',
    gap: 10,
  };
}

export function selectionPlate(palette: Palette): CSSProperties {
  return {
    ...plate(palette),
    top: 12,
    right: 12,
    maxWidth: '50%',
    overflowWrap: 'anywhere',
  };
}

export function diagnosticStyle(palette: Palette): CSSProperties {
  return {
    fontFamily: 'monospace',
    fontSize: 11,
    color: palette.mutedForeground,
  };
}

export function cameraPlate(palette: Palette): CSSProperties {
  return { ...plate(palette), right: 12, bottom: 12, display: 'grid' };
}
