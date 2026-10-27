import { z } from 'zod';
import { textProps } from '../core-kit-props';
import { audioProps, imageProps, videoProps } from '../media-kit-props';
import { part } from '../part';
import { avatarProps, iconProps } from '../presentation-kit-props';
import { codeProps, linkProps, markdownProps } from '../prose-kit-props';
import { labelProps } from '../status-kit-props';

const textReader =
  'Reads `accessibilityLabel` when set; otherwise reads the text children.';

export const contentParts = {
  Markdown: part(
    'CommonMark content with Argo typography, Code fences and Link navigation.',
    markdownProps,
    {
      group: 'content',
      accessibility: {
        keyboard:
          'Markdown adds no focus stop; keyboard focus reaches links and other interactive content in document order.',
        voiceOver:
          'VoiceOver reads the Markdown in document order and exposes links as separate link controls.',
        talkBack:
          'TalkBack reads the Markdown in document order and exposes links as separate link controls.',
      },
    },
  ),
  Code: part(
    'A code block or diff with a copy action; provide either code or diff.',
    codeProps,
    { group: 'content' },
  ),
  Link: part('Text that opens an allowed URL or an Argo route.', linkProps, {
    group: 'content',
    accessibility: {
      keyboard:
        'Keyboard focus reaches the Link in platform order; Enter opens its destination.',
      voiceOver:
        'VoiceOver exposes a link, reads its label, and opens its destination when activated.',
      talkBack:
        'TalkBack exposes a link, reads its label, and opens its destination when activated.',
    },
  }),
  Video: part(
    'A video drawn by the stock player: AVPlayerViewController on iOS, Media3 on Android, the browser’s video controls on web and desktop.',
    videoProps,
    {
      group: 'content',
      label: 'The required `accessibilityLabel` names the video.',
      accessibility: {
        keyboard:
          'On web and desktop the browser’s video controls take focus: Space plays or pauses and the arrow keys seek. An error frame is one focus stop that retries with Enter or Space.',
        voiceOver:
          'VoiceOver reads accessibilityLabel, then the stock player’s own controls. autoPlay never plays sound and stays paused with Reduce Motion.',
        talkBack:
          'TalkBack reads accessibilityLabel, then Media3’s own controls. autoPlay never plays sound and stays paused with Remove animations.',
      },
      appearance:
        'A black frame at the chosen aspect, so letterboxing matches the player. The poster with the platform Spinner shows until the first frame; a failed load draws a muted frame with a broken-image icon.',
    },
  ),
  Audio: part(
    'An Argo transport row on a tint tray: play or pause, a scrubber and elapsed / total time.',
    audioProps,
    {
      group: 'content',
      label: 'The required `accessibilityLabel` names the audio.',
      accessibility: {
        keyboard:
          'The play button and the scrubber are focus stops: Enter or Space plays or pauses, and the arrow keys seek.',
        voiceOver:
          'VoiceOver reads a Play or Pause button and an adjustable scrubber, each named with accessibilityLabel; the scrubber’s value is the elapsed and total time.',
        talkBack:
          'TalkBack reads a Play or Pause button and a seek control, each named with accessibilityLabel; the seek control’s state is the elapsed and total time.',
      },
      appearance:
        'Drawn by Argo the same everywhere: a tint tray with each platform’s ghost IconButton and Slider. No volume, speed or waveform. One clip plays at a time.',
    },
  ),
  Image: part(
    'An image loaded through the Server, with loading and error frames.',
    imageProps,
    { group: 'content' },
  ),
  Avatar: part(
    'An image, initials or person symbol with optional status.',
    avatarProps,
    { group: 'content' },
  ),
  Icon: part('A native symbol with semantic size and tone.', iconProps, {
    group: 'content',
  }),
  Text: part(
    'Text content with an optional Argo typography role and semantic tone.',
    textProps,
    {
      group: 'content',
      // Text children travel as the `children` prop, never as child nodes.
      container: false,
      slots: { children: [] },
      accessibility: {
        label:
          'Text children supply the content. Optional `accessibilityLabel` overrides the spoken label.',
        keyboard: 'Text is not focusable and adds no keyboard shortcut.',
        voiceOver: textReader,
        talkBack: textReader,
      },
      appearance:
        '`tone` selects an Argo semantic text color that adapts to light and dark appearance. This part has no arbitrary `color` or Image prop.',
      sdkProps:
        'Plugin JSX accepts text children; the worker serializes them as the `children` prop.',
    },
  ),
  Label: part(
    'Short text with an optional icon and semantic tone.',
    labelProps,
    {
      group: 'content',
      label:
        'The text supplies the accessible name; accessibilityLabel overrides it.',
    },
  ),
  Kbd: part(
    'A keyboard shortcut key or chord for desktop and web.',
    z.object({
      keys: z.array(z.string()).min(1).describe('Keys in the shortcut.'),
    }),
    {
      group: 'content',
      wire: false,
      label: 'The displayed key names are the accessible name.',
      accessibility: {
        keyboard:
          'Kbd is a static shortcut hint and does not enter the focus order or activate the shortcut.',
        voiceOver:
          'VoiceOver reads the displayed key names as a shortcut hint; it does not activate them.',
        talkBack:
          'TalkBack reads the displayed key names as a shortcut hint; it does not activate them.',
      },
    },
  ),
};
