import { ChatsIcon } from 'phosphor-react-native/src/icons/Chats';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { TicketIcon } from 'phosphor-react-native/src/icons/Ticket';
import { TreeStructureIcon } from 'phosphor-react-native/src/icons/TreeStructure';

export const shellSections = {
  sessions: { title: 'Sessions', icon: ChatsIcon },
  issues: { title: 'Issues', icon: TicketIcon },
  atlas: { title: 'Atlas', icon: TreeStructureIcon },
  settings: { title: 'Settings', icon: GearSixIcon },
} as const;

export type ShellSection = keyof typeof shellSections;
