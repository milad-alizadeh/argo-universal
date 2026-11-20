import { z } from 'zod';
import {
  ConversationDeviceChange,
  ConversationDeviceList,
} from '../conversation';
import type { OperationDefinition } from './index';

// The microphone and speaker of the App a Conversation uses (ADR-0064): the one carrying the Conversation, else the one used last.
export const conversationDeviceOperations = {
  'conversation.listDevices': {
    id: 'conversation.listDevices',
    icon: 'voice',
    label: 'List Conversation devices',
    description:
      'List the microphones and speakers of the App a Conversation uses, and the ones it chose: the App carrying the running Conversation, else the one that started the last Conversation, else the one connected last. Refused when no App that can carry a Conversation is connected.',
    params: z.strictObject({}).default({}),
    result: ConversationDeviceList,
    tier: 'read',
    keywords: [
      'conversation',
      'voice',
      'microphone',
      'speaker',
      'audio',
      'devices',
    ],
  },
  'conversation.chooseDevices': {
    id: 'conversation.chooseDevices',
    icon: 'voice',
    label: 'Choose Conversation devices',
    description:
      'Choose the microphone or speaker, by id from conversation.listDevices, on the App a Conversation uses; null follows the system. A running Conversation moves to them at once. Refused when no App is connected or it has no such device.',
    params: ConversationDeviceChange,
    result: ConversationDeviceList,
    tier: 'confirm',
    keywords: [
      'conversation',
      'voice',
      'microphone',
      'speaker',
      'audio',
      'devices',
    ],
  },
} as const satisfies Record<string, OperationDefinition>;
