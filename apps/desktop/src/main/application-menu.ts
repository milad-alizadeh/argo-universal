import type { MenuItemConstructorOptions } from 'electron';

// ⌘⇧V (Ctrl+Shift+V elsewhere) pastes plain text, as the Composer's rich text field expects.
const pasteAsPlainTextAccelerator = 'CmdOrCtrl+Shift+V';

const speechMenu: MenuItemConstructorOptions = {
  label: 'Speech',
  submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
};

const editCommands: MenuItemConstructorOptions[] = [
  { role: 'undo' },
  { role: 'redo' },
  { type: 'separator' },
  { role: 'cut' },
  { role: 'copy' },
  { role: 'paste' },
  { role: 'pasteAndMatchStyle', accelerator: pasteAsPlainTextAccelerator },
  { role: 'delete' },
  { role: 'selectAll' },
];

// Electron's own Edit menu, with Paste and Match Style on ⌘⇧V instead of its default ⌥⇧⌘V.
function editMenu(isMac: boolean): MenuItemConstructorOptions {
  const macOnly: MenuItemConstructorOptions[] = isMac
    ? [{ type: 'separator' }, speechMenu]
    : [];

  return { role: 'editMenu', submenu: [...editCommands, ...macOnly] };
}

// Electron's default menus, with the Edit menu above and an empty Help menu; macOS adds the app menu first.
export function applicationMenu(
  platform: NodeJS.Platform,
): MenuItemConstructorOptions[] {
  const isMac = platform === 'darwin';

  return [
    ...macAppMenu(isMac),
    { role: 'fileMenu' },
    editMenu(isMac),
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    // On macOS the Help menu holds the menu search field.
    { role: 'help', submenu: [] },
  ];
}

function macAppMenu(isMac: boolean): MenuItemConstructorOptions[] {
  return isMac ? [{ role: 'appMenu' }] : [];
}
