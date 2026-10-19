import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from '../plugin-part-schemas';

const video = pluginPartSchemas.Video.props;

const audio = pluginPartSchemas.Audio.props;

const hash = 'a'.repeat(64);

const clip = { pluginId: 'hello', hash, format: 'mp4' };

const sound = { pluginId: 'hello', hash, format: 'm4a' };

describe('media prop boundary', () => {
  it.each([
    ['a Video', video, { source: clip, accessibilityLabel: 'Demo clip' }],
    ['an Audio', audio, { source: sound, accessibilityLabel: 'Chime' }],
  ])('accepts %s naming a resolved asset', (_name, schema, props) => {
    expect(schema.safeParse(props).success).toBe(true);
  });

  // The App never fetches from a Plugin's host, so a URL or a Plugin path cannot reach it.
  it.each([
    'https://example.com/clip.mp4',
    { asset: 'assets/clip.mp4' },
    { url: 'https://example.com/clip.mp4' },
  ])('refuses an unresolved Video source %j', (source) => {
    expect(
      video.safeParse({ source, accessibilityLabel: 'Demo clip' }).success,
    ).toBe(false);
  });

  it.each([
    [
      'a Video playing audio',
      video,
      { source: sound, accessibilityLabel: 'x' },
    ],
    [
      'an Audio playing video',
      audio,
      { source: clip, accessibilityLabel: 'x' },
    ],
    ['a Video without a label', video, { source: clip }],
    ['an Audio without a label', audio, { source: sound }],
  ])('refuses %s', (_name, schema, props) => {
    expect(schema.safeParse(props).success).toBe(false);
  });
});
