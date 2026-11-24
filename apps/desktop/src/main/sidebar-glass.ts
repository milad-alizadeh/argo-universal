import { createRequire } from 'node:module';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import { z } from 'zod';
import { hiddenSidebarFrame, type SidebarFrame } from '../sidebar-glass-frame';
import { reportUnrecognised } from './report-unrecognised';
import { isTrustedWindow } from './trusted-window';

interface SidebarGlass {
  attach(handle: Buffer): boolean;
  setFrame(handle: Buffer, frame: SidebarFrame): void;
}

const Frame = z.strictObject({
  x: z.number().nonnegative(),
  width: z.number().nonnegative(),
  top: z.number().nonnegative(),
  bottom: z.number().nonnegative(),
});

// Electron takes a clear ARGB value even when the page asks for an opaque colour.
export const clearWindowBackground = `#${Buffer.from([0, 0, 0, 0]).toString('hex')}`;

const glassMinimumMacVersion = 26;

function isSidebarGlass(addon: unknown): addon is SidebarGlass {
  return (
    typeof addon === 'object' &&
    addon !== null &&
    'attach' in addon &&
    typeof addon.attach === 'function' &&
    'setFrame' in addon &&
    typeof addon.setFrame === 'function'
  );
}

const glassWindows = new WeakSet<BrowserWindow>();

export const hasSidebarGlass = (window: BrowserWindow): boolean =>
  glassWindows.has(window);

export function loadSidebarGlass(): SidebarGlass | undefined {
  if (
    process.platform !== 'darwin' ||
    Number.parseInt(process.getSystemVersion(), 10) < glassMinimumMacVersion
  )
    return undefined;

  try {
    const load = createRequire(__filename);
    const addon: unknown = load(path.join(__dirname, 'sidebar-glass.node'));

    if (isSidebarGlass(addon)) return addon;
    throw new Error('Missing sidebar glass bindings');
  } catch (error) {
    process.stderr.write(`Could not load sidebar glass: ${String(error)}\n`);

    return undefined;
  }
}

export function bindSidebarGlass(
  window: BrowserWindow,
  glass: SidebarGlass,
  origin: string,
): boolean {
  const handle = window.getNativeWindowHandle();

  if (!glass.attach(handle)) return false;

  glassWindows.add(window);
  window.webContents.ipc.on('window:sidebar-glass-frame', (event, input) => {
    if (
      event.senderFrame !== window.webContents.mainFrame ||
      !isTrustedWindow(event, origin)
    )
      return;

    const frame = Frame.safeParse(input);

    if (!frame.success) {
      reportUnrecognised('sidebar glass frame', frame.error);

      return;
    }

    glass.setFrame(handle, frame.data);
  });
  window.webContents.on(
    'did-start-navigation',
    ({ isSameDocument, isMainFrame }) => {
      if (isMainFrame && !isSameDocument)
        glass.setFrame(handle, hiddenSidebarFrame);
    },
  );

  return true;
}
