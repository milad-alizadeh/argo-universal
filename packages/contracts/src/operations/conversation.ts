import { z } from 'zod';
import {
  ConversationEndInput,
  ConversationEndOutput,
  ConversationStartInput,
  ConversationStartOutput,
  ConversationStatus,
} from '../conversation';
import type { OperationDefinition } from './index';

// The Conversation's Operations (ADR-0064): the App starts, ends and reads them; an Agent only hangs up its own.
export const conversationOperations = {
  'conversation.status': {
    id: 'conversation.status',
    label: 'Read Conversation status',
    icon: 'voice',
    description:
      'Read the running Conversation, how the last one ended, and whether a new one can start.',
    params: z.strictObject({}).default({}),
    result: ConversationStatus,
    tier: 'read',
    keywords: ['voice', 'call', 'talk', 'speak', 'microphone'],
  },
  'conversation.start': {
    id: 'conversation.start',
    label: 'Start Conversation',
    icon: 'voice',
    description:
      "Start a Conversation attached to a Session from the App's connection offer. One Conversation runs at a time.",
    params: ConversationStartInput,
    result: ConversationStartOutput,
    tier: 'confirm',
    keywords: ['voice', 'call', 'talk', 'speak', 'microphone', 'start'],
  },
  'conversation.end': {
    id: 'conversation.end',
    label: 'End Conversation',
    icon: 'voice-off',
    description: "End the Session's Conversation from the App's End button.",
    params: ConversationEndInput,
    result: ConversationEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'end', 'stop', 'microphone'],
  },
  'conversation.hangUp': {
    id: 'conversation.hangUp',
    icon: 'voice-off',
    label: 'Hang up Conversation',
    description:
      'End the Conversation of the calling Session, because the person clearly said they are done talking. Refused when the Session has no Conversation, and for any other Session. Do not use it when the person only asks to stop work or pause.',
    params: ConversationEndInput,
    result: ConversationEndOutput,
    tier: 'act',
    keywords: ['voice', 'call', 'hang up', 'goodbye', 'done', 'end'],
  },
} as const satisfies Record<string, OperationDefinition>;
