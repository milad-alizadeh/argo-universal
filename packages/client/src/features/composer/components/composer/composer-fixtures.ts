import type { ComposerSuggestion } from '@repo/kit/primitives/controls/rich-textarea';
import type { ComposerMockProps } from '../../../../../mocks/composer-mock';
import {
  imageAttachment,
  oversizedAttachment,
} from '../composer-attachment-card/composer-attachment-card-fixtures';

/*
 * A story supplies the draft, attachment, send and stop callbacks; a fixture is the draft itself
 * and the Session the Composer sits in.
 */
type ComposerFixture = Omit<
  ComposerMockProps,
  | 'onDraftChange'
  | 'onAttachImages'
  | 'onAttachCamera'
  | 'onAttachFiles'
  | 'onSelectSlashCommand'
  | 'onCreateGoal'
  | 'onSend'
  | 'onStop'
>;

const prompt = 'Match the spacing and colours.';

const emptyDraft = { text: '', attachments: [] };

// Nothing written yet: Send is blocked.
export const emptyComposer = { draft: emptyDraft } satisfies ComposerFixture;

// A prompt with something in it: Send is ready.
export const readyComposer = {
  draft: { text: prompt, attachments: [] },
} satisfies ComposerFixture;

// The prompt is on its way: Send shows that it is sending.
export const sendingComposer = {
  draft: { text: prompt, attachments: [] },
  sending: true,
} satisfies ComposerFixture;

// The Composer is inactive: the field, the toolbar and the trays all go quiet.
export const disabledComposer = {
  draft: { text: prompt, attachments: [] },
  disabled: true,
} satisfies ComposerFixture;

// A draft long enough to wrap: the field grows to hold every line.
export const multiLineComposer = {
  draft: {
    text: 'Match the spacing and colours.\nKeep the phone layout readable.\nUse the shared light and dark themes.',
    attachments: [],
  },
} satisfies ComposerFixture;

// A draft past the Composer's max height: the envelope scrolls.
export const scrollableDraftComposer = {
  draft: {
    text: 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
    attachments: [],
  },
} satisfies ComposerFixture;

// An image in the draft: the card grows a row of attachment tiles above the field.
export const attachedImageComposer = {
  draft: {
    text: 'Match these screenshots.',
    attachments: [imageAttachment.attachment],
  },
} satisfies ComposerFixture;

// Past the upload limit: the tile takes the danger border and Send stays blocked.
export const oversizedAttachmentComposer = {
  draft: {
    text: 'Match these screenshots.',
    attachments: [oversizedAttachment.attachment],
  },
} satisfies ComposerFixture;

// The Turn is running: Send becomes Stop.
export const runningTurnComposer = {
  draft: emptyDraft,
  sessionStarted: true,
  running: true,
} satisfies ComposerFixture;

// Inside a Session: the Plan tray sits above the card and the status tray below it.
export const startedSessionComposer = {
  draft: emptyDraft,
  sessionStarted: true,
} satisfies ComposerFixture;

// A Session with no Plan: the tray above the card goes.
export const planlessSessionComposer = {
  draft: emptyDraft,
  sessionStarted: true,
  plan: [],
} satisfies ComposerFixture;

export const slashSuggestionsComposer = {
  draft: { text: '/', attachments: [] },
  slashCommands: [
    { name: 'inspect', description: 'Review changes' },
    { name: 'review', description: 'Review a file' },
  ],
} satisfies ComposerFixture;

// A second source beside the Agent's Slash commands; its result carries a resource to send with the prompt.
export const seventhItem = {
  id: 'item-7',
  label: 'Item 7',
  detail: 'Seventh item',
  insert: 'ITEM-7 ',
  resource: {
    type: 'resource_link',
    name: 'ITEM-7',
    uri: 'example://items/7',
    title: 'Seventh item',
  },
} satisfies ComposerSuggestion;

export const secondSourceComposer = {
  draft: { text: '', attachments: [] },
  slashCommands: [{ name: 'inspect', description: 'Review changes' }],
  suggestionSources: [
    {
      id: 'items',
      title: 'Items',
      query: (query: string): ComposerSuggestion[] =>
        'item'.startsWith(query.toLowerCase()) ? [seventhItem] : [],
    },
  ],
} satisfies ComposerFixture;
