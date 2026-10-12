import type { MenuItemConstructorOptions } from 'electron';

// ⌘⇧V (Ctrl+Shift+V elsewhere) pastes plain text, as the Composer's rich text field expects.
const pasteAsPlainTextAccelerator = 'CmdOrCtrl+Shift+V';

const speechMenu: MenuItemConstructorOptions = {
  label: 'Speech',
  submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
};

// Electron's own Edit menu, with Paste and Match Style on ⌘⇧V instead of its default ⌥⇧⌘V.
function editMenu(isMac: boolean): MenuItemConstructorOptions {
  const macOnly: MenuItemConstructorOptions[] = isMac
    ? [{ type: 'separator' }, speechMenu]
    : [];
  return {
    role: 'editMenu',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle', accelerator: pasteAsPlainTextAccelerator },
      { role: 'delete' },
      { role: 'selectAll' },
      ...macOnly,
    ],
  };
}

// Electron's default menus, with the Edit menu above; macOS adds the app menu first.
export function applicationMenu(
  platform: NodeJS.Platform,
): MenuItemConstructorOptions[] {
  const isMac = platform === 'darwin';
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [{ role: 'appMenu' }]
    : [];
  return [
    ...appMenu,
    { role: 'fileMenu' },
    editMenu(isMac),
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
}
