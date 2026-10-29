import { BrowserWindow, ipcMain, nativeImage, screen } from 'electron';
import { z } from 'zod';
import { reportUnrecognised } from './report-unrecognised';
import { isTrustedWindow } from './trusted-window';

const largestPointSize = 512;

const SymbolImageRequest = z.object({
  name: z.string().regex(/^[a-z\d]+(?:\.[a-z\d]+)*$/),
  pointSize: z.number().int().min(1).max(largestPointSize),
});

type SymbolImageRequest = z.infer<typeof SymbolImageRequest>;

/*
 * Apple's licence allows SF Symbols only in apps for Apple platforms, so macOS draws them at runtime and no file ships.
 * The page asks in device pixels, but AppKit draws a point size at the display's backing scale, so the request is
 * halved on a 2x display and the image comes back at the pixel size asked for.
 */
function renderSymbolImage(
  { name, pointSize }: SymbolImageRequest,
  scaleFactor: number,
): string | null {
  const image = nativeImage.createFromNamedImage(name, {
    pointSize: Math.max(1, Math.round(pointSize / scaleFactor)),
  });

  return image.isEmpty() ? null : image.toDataURL();
}

// The scale of the display the asking window is on.
function displayScaleFactor(sender: Electron.WebContents): number {
  const window = BrowserWindow.fromWebContents(sender);

  return (
    window
      ? screen.getDisplayMatching(window.getBounds())
      : screen.getPrimaryDisplay()
  ).scaleFactor;
}

export function handleSymbolImages(windowOrigin: string): void {
  ipcMain.handle('symbol:render', (event, input): string | null => {
    if (!isTrustedWindow(event, windowOrigin)) return null;
    const request = SymbolImageRequest.safeParse(input);

    if (request.success)
      return renderSymbolImage(request.data, displayScaleFactor(event.sender));
    reportUnrecognised('symbol image request', request.error);

    return null;
  });
}
