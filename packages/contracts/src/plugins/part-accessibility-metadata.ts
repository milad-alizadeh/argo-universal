import type { WirePartReference } from './wire-part-reference';

type Accessibility = WirePartReference['accessibility'];

export const iconAccessibility: Partial<Accessibility> = {
  keyboard:
    'A decorative Icon adds no focus stop; an informative Icon is announced in reading order with its accessibilityLabel.',
  voiceOver:
    'VoiceOver skips a decorative Icon and announces accessibilityLabel for an informative Icon.',
  talkBack:
    'TalkBack skips a decorative Icon and announces accessibilityLabel for an informative Icon.',
};

export const kbdAccessibility: Partial<Accessibility> = {
  keyboard:
    'Kbd is a static shortcut hint and does not enter the focus order or activate the shortcut.',
  voiceOver:
    'VoiceOver reads the displayed key names as a shortcut hint; it does not activate them.',
  talkBack:
    'TalkBack reads the displayed key names as a shortcut hint; it does not activate them.',
};

export const avatarAccessibility: Partial<Accessibility> = {
  keyboard:
    'Avatar is not keyboard-focusable on its own; a containing control supplies the focus stop.',
  voiceOver:
    'VoiceOver exposes the Avatar as an image and reads accessibilityLabel, or the initials when no label is supplied.',
  talkBack:
    'TalkBack exposes the Avatar as an image and reads accessibilityLabel, or the initials when no label is supplied.',
};

export const searchFieldAccessibility: Partial<Accessibility> = {
  keyboard:
    'Keyboard focus reaches the Search field in platform order; typing updates its App-owned value and dispatches onChangeText.',
  voiceOver:
    'VoiceOver exposes a search text field, reads the localized Search name, and reports its current value.',
  talkBack:
    'TalkBack exposes a search text field, reads the localized Search name, and reports its current value.',
};

export const statusDotAccessibility: Partial<Accessibility> = {
  keyboard:
    'StatusDot adds no keyboard focus stop; informative status is announced in reading order.',
  voiceOver:
    'VoiceOver skips a decorative StatusDot and announces accessibilityLabel when the mark conveys status.',
  talkBack:
    'TalkBack skips a decorative StatusDot and announces accessibilityLabel when the mark conveys status.',
};

export const spinnerAccessibility: Partial<Accessibility> = {
  keyboard: 'Spinner adds no keyboard focus stop or shortcut.',
  voiceOver:
    'VoiceOver exposes an indeterminate progress indicator and announces Loading, or the supplied accessibilityLabel.',
  talkBack:
    'TalkBack exposes an indeterminate progress indicator and announces Loading, or the supplied accessibilityLabel.',
};

export const progressBarAccessibility: Partial<Accessibility> = {
  keyboard: 'ProgressBar adds no keyboard focus stop or shortcut.',
  voiceOver:
    'VoiceOver exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
  talkBack:
    'TalkBack exposes a progress indicator and announces its value with accessibilityLabel when supplied.',
};

export const markdownAccessibility: Partial<Accessibility> = {
  keyboard:
    'Markdown adds no focus stop; keyboard focus reaches links and other interactive content in document order.',
  voiceOver:
    'VoiceOver reads the Markdown in document order and exposes links as separate link controls.',
  talkBack:
    'TalkBack reads the Markdown in document order and exposes links as separate link controls.',
};

export const linkAccessibility: Partial<Accessibility> = {
  keyboard:
    'Keyboard focus reaches the Link in platform order; Enter opens its destination.',
  voiceOver:
    'VoiceOver exposes a link, reads its label, and opens its destination when activated.',
  talkBack:
    'TalkBack exposes a link, reads its label, and opens its destination when activated.',
};

export const gridAccessibility: Partial<Accessibility> = {
  keyboard:
    'Grid is a static layout; keyboard focus moves through interactive children in platform order.',
  voiceOver:
    'VoiceOver traverses the Grid children in source order; the layout adds no grid navigation semantics.',
  talkBack:
    'TalkBack traverses the Grid children in source order; the layout adds no grid navigation semantics.',
};

export const dialogAccessibility: Partial<Accessibility> = {
  keyboard:
    'Focus remains within the Dialog until it closes; Escape closes it when dismissal is allowed.',
  voiceOver:
    'VoiceOver exposes a dialog named by its title and keeps navigation within it until it closes.',
  talkBack:
    'TalkBack exposes a dialog named by its title and keeps navigation within it until it closes.',
};
