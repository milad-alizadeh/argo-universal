import { describe, expect, it } from 'vitest';
import { applicationMenu } from './application-menu';

function pasteAsPlainText(platform: NodeJS.Platform): unknown {
  const edit = applicationMenu(platform).find(
    (menu) => menu.role === 'editMenu',
  );
  const items = Array.isArray(edit?.submenu) ? edit.submenu : [];
  return items.find((item) => item.role === 'pasteAndMatchStyle')?.accelerator;
}

describe('application menu', () => {
  it.each<NodeJS.Platform>(['darwin', 'win32', 'linux'])(
    'binds Paste and Match Style to ⌘⇧V or Ctrl+Shift+V on %s',
    (platform) => {
      expect(pasteAsPlainText(platform)).toBe('CmdOrCtrl+Shift+V');
    },
  );
});
