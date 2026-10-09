import { ChatsIcon } from 'phosphor-react-native/src/icons/Chats';
import { GearSixIcon } from 'phosphor-react-native/src/icons/GearSix';
import { TicketIcon } from 'phosphor-react-native/src/icons/Ticket';
import { TreeStructureIcon } from 'phosphor-react-native/src/icons/TreeStructure';
import type { Section } from '../navigation/sections';

export type { Section } from '../navigation/sections';

export const shellSections = {
  sessions: { title: 'Sessions', icon: ChatsIcon },
  issues: { title: 'Issues', icon: TicketIcon },
  atlas: { title: 'Atlas', icon: TreeStructureIcon },
  settings: { title: 'Settings', icon: GearSixIcon },
} as const satisfies Record<Section, { title: string; icon: typeof ChatsIcon }>;
