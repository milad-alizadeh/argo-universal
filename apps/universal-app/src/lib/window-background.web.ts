import { useEffect } from 'react';
import { useCSSVariable } from 'uniwind';

const hexadecimal = 16;

// Red, green and blue; the window takes no alpha.
const colourChannels = 3;

const channelHex = (channel: number): string =>
  channel.toString(hexadecimal).padStart(2, '0');

/*
 * Electron reads hex, rgb() and hsl() only, so the token, in whatever colour
 * space, is painted once and read back as sRGB hex.
 */
function toHex(color: string): string {
  const context = document.createElement('canvas').getContext('2d');

  if (!context) return color;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);

  const channels = context
    .getImageData(0, 0, 1, 1)
    .data.subarray(0, colourChannels);

  return `#${Array.from(channels, channelHex).join('')}`;
}

function paintDesktopWindow(content: string): void {
  const desktopWindow = window.argo?.window;

  if (desktopWindow) desktopWindow.setBackgroundColor(toHex(content));
}

/*
 * global.css gives the page the content surface. In the desktop app the
 * window behind the page shows while it resizes, so it takes the surface too.
 */
export function useWindowBackground(): void {
  const content = useCSSVariable('--color-content');

  useEffect(() => {
    if (typeof content === 'string') paintDesktopWindow(content);
  }, [content]);
}
