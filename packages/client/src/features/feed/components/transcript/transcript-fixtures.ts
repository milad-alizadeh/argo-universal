import type { FeedItemProps } from '../feed-item';

// What was said on a Conversation, as the Feed draws it: the person's words in a bubble, the voice's as plain text.
type TranscriptFixture = Pick<FeedItemProps, 'item'>;

const envelope = {
  sessionId: 'session-1',
  position: 1,
  revision: 1,
  turnId: null,
} as const;

// The words each fixture says, so a test reads them from here and not from the drawing.
const words = {
  person:
    'Build the Session layout from spec 0003. Use the Reusables primitives and only theme tokens — stop and ask if something is missing.',
  voice:
    "The shell already switches at 720 px, so the Session screen only needs a wide and a phone tree. I'll keep the Plan in the composer tray, under the card.",
  personPartial: 'Build the Session layout from spec 0003. Use the',
  conversationPartial: 'The shell already switches at 720 px, so the Session',
};

const text = (said: string): { type: 'text'; text: string }[] => [
  { type: 'text', text: said },
];

export const personSaid = {
  item: {
    type: 'row',
    row: {
      ...envelope,
      id: 'call-1:person:p1',
      messageId: 'p1',
      sessionUpdate: 'person_transcript',
      state: 'settled',
      content: text(words.person),
    },
  },
} satisfies TranscriptFixture;

export const voiceSaid = {
  item: {
    type: 'row',
    row: {
      ...envelope,
      id: 'call-1:voice:v1',
      messageId: 'v1',
      sessionUpdate: 'voice_transcript',
      state: 'settled',
      content: text(words.voice),
    },
  },
} satisfies TranscriptFixture;

// Words not final yet: the same row, under the id its final words are stored with, flagged, in place at the tail of the Feed.
export const personSaying = {
  item: {
    type: 'row',
    partial: true,
    row: {
      ...personSaid.item.row,
      state: 'open',
      content: text(words.personPartial),
    },
  },
} satisfies TranscriptFixture;

const voiceSaying = {
  item: {
    type: 'row',
    partial: true,
    row: {
      ...voiceSaid.item.row,
      state: 'open',
      content: text(words.conversationPartial),
    },
  },
} satisfies TranscriptFixture;

// The voice's words as the VoiceTranscript component takes them: final, then still being said.
export const voiceSaidProps = { row: voiceSaid.item.row };

export const voiceSayingProps = { row: voiceSaying.item.row, partial: true };
