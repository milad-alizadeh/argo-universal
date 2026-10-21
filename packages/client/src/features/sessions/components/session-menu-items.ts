import type { SessionStatus } from '@repo/contracts';
import type { IconName } from '@repo/kit/symbols/icon-names';

// What a Session's menus offer, from its row's right-click or long press, or its page's header.
export interface SessionMenu {
  // An archived Session offers neither action.
  archived: boolean;
  status: SessionStatus;
  changes?: { files: number; onPress: () => void };
  onRename?: () => void;
  onArchive?: () => void;
}

// One action of a Session's menus: the row's context menu and the header's Menu both take it.
export interface SessionMenuItem {
  label: string;
  icon: Extract<IconName, 'rename' | 'archive' | 'diff'>;
  disabled: boolean;
  onPress: () => void;
}

// The Server archives only a Session with no Turn: one running or waiting on an answer refuses it.
const isTurnActive = (status: SessionStatus): boolean =>
  status === 'running' || status === 'needs_input';

const renameItem = ({ onRename }: SessionMenu): SessionMenuItem | undefined =>
  onRename && {
    label: 'Rename',
    icon: 'rename',
    disabled: false,
    onPress: onRename,
  };

// While a Turn runs, Archive stays but is disabled.
const archiveItem = ({
  status,
  onArchive,
}: SessionMenu): SessionMenuItem | undefined =>
  onArchive && {
    label: 'Archive',
    icon: 'archive',
    disabled: isTurnActive(status),
    onPress: onArchive,
  };

const isItem = (item: SessionMenuItem | undefined): item is SessionMenuItem =>
  item !== undefined;

// The header can offer changed files before Rename and Archive; archived Sessions keep only changed files.
export function sessionMenuItems(menu: SessionMenu): SessionMenuItem[] {
  const changes: SessionMenuItem[] = menu.changes
    ? [
        {
          label: `Changed files · ${menu.changes.files}`,
          icon: 'diff',
          disabled: false,
          onPress: menu.changes.onPress,
        },
      ]
    : [];

  return menu.archived
    ? changes
    : [...changes, ...[renameItem(menu), archiveItem(menu)].filter(isItem)];
}
