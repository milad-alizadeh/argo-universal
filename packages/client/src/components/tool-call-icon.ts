import { knownCommandActions, type ToolCallUpdate } from '@repo/contracts';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { GlobeIcon } from 'phosphor-react-native/src/icons/Globe';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { TerminalWindowIcon } from 'phosphor-react-native/src/icons/TerminalWindow';
import { WrenchIcon } from 'phosphor-react-native/src/icons/Wrench';

export function toolCallIcon(row: ToolCallUpdate) {
  const category = knownCommandActions(row)[0]?.type ?? row.kind;
  switch (category) {
    case 'read':
    case 'list':
      return BookOpenIcon;
    case 'search':
    case 'fetch':
      return GlobeIcon;
    case 'execute':
      return TerminalWindowIcon;
    case 'edit':
    case 'delete':
    case 'move':
      return PencilSimpleIcon;
    default:
      return WrenchIcon;
  }
}
