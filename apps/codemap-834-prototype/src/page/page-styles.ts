import type { CSSProperties } from 'react';
import { plate } from '../code-map';
import type { Palette } from '../code-map';

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

/** Comes before the Code Map for focus order, so it lifts itself over the canvas. */
export function togglePlate(palette: Palette): CSSProperties {
  return {
    ...plate(palette),
    left: 12,
    top: 12,
    display: 'flex',
    gap: 4,
    zIndex: 1,
  };
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
