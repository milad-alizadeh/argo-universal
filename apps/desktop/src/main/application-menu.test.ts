import { describe, expect, it } from 'vitest';
import { applicationMenu } from './application-menu';

function pasteAsPlainText(platform: NodeJS.Platform): string | undefined {
  const edit = applicationMenu(platform).find(
    (menu) => menu.role === 'editMenu',
  );

  const items = menuItems(edit);

  return items.find((item) => item.role === 'pasteAndMatchStyle')?.accelerator;
}

function menuItems(
  menu: ReturnType<typeof applicationMenu>[number] | undefined,
): Electron.MenuItemConstructorOptions[] {
  return Array.isArray(menu?.submenu) ? menu.submenu : [];
}

describe('application menu', () => {
  it.each<NodeJS.Platform>(['darwin', 'win32', 'linux'])(
    'binds Paste and Match Style to ⌘⇧V or Ctrl+Shift+V on %s',
    (platform) => {
      expect(pasteAsPlainText(platform)).toBe('CmdOrCtrl+Shift+V');
    },
  );

  it('ends with the Help menu, where macOS puts menu search', () => {
    expect(applicationMenu('darwin').at(-1)?.role).toBe('help');
  });
});
