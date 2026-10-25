import { z } from 'zod';
import { PluginAssetRef } from './assets';
import { part, stringLabel } from './plugin-part-schema-utils';

// Media names a reference from `argo.assets.resolve`, so the App loads it from the Server's asset route, never from a Plugin's host (ADR-0031).
const resolved =
  'from `argo.assets.resolve`: a Plugin file, or a remote URL the Server fetched.';

const videoAsset = PluginAssetRef.extend({
  format: z.enum(['mp4', 'webm', 'mov']),
}).describe(`The video, ${resolved}`);

const audioAsset = PluginAssetRef.extend({
  format: z.enum(['mp3', 'm4a', 'ogg', 'wav', 'aac', 'flac']),
}).describe(`The audio, ${resolved}`);

const posterAsset = PluginAssetRef.extend({
  format: z.enum(['png', 'jpeg', 'gif', 'webp', 'avif']),
}).describe(`An image drawn before play, ${resolved}`);

const videoProps = z.object({
  source: videoAsset,
  poster: posterAsset.optional(),
  aspect: z
    .enum(['landscape', 'square', 'portrait'])
    .optional()
    .describe(
      'Frame aspect: landscape 16:9 (default), square 1:1, portrait 9:16.',
    ),
  radius: z
    .enum(['control', 'none'])
    .optional()
    .describe('Corner radius token: control (default) or none.'),
  autoPlay: z
    .boolean()
    .optional()
    .describe(
      'Play at once, muted and looping, with the controls hidden until tapped. Stays paused with Reduce Motion.',
    ),
  accessibilityLabel: stringLabel.describe('Spoken name of the video.'),
});

const audioProps = z.object({
  source: audioAsset,
  accessibilityLabel: stringLabel.describe(
    'Spoken name of the audio; names its play button and scrubber.',
  ),
});

export const mediaWireParts = {
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
};
