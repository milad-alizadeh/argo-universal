import { describe, expect, it } from 'vitest';
import { kitComponentSchemas } from '../kit-component-schemas';

const video = kitComponentSchemas.Video.props;

const audio = kitComponentSchemas.Audio.props;

const hash = 'a'.repeat(64);

const clip = { pluginId: 'example', hash, format: 'mp4' };

const sound = { pluginId: 'example', hash, format: 'm4a' };

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

const picture = { pluginId: 'example', hash, format: 'jpeg' };

it('accepts Image and Avatar assets resolved by the Server', () => {
  expect(
    kitComponentSchemas.Image.props.safeParse({
      source: picture,
      accessibilityLabel: 'Preview',
    }).success,
  ).toBe(true);
  expect(
    kitComponentSchemas.Avatar.props.safeParse({
      src: picture,
      name: 'Sam Rivera',
      size: 'xl',
      accessibilityLabel: 'Sam Rivera',
    }).success,
  ).toBe(true);
});

it.each([
  'https://example.com/private.png',
  { uri: 'https://example.com/private.png' },
])('refuses an unresolved image or avatar source', (source) => {
  expect(
    kitComponentSchemas.Image.props.safeParse({
      source,
      accessibilityLabel: 'Preview',
    }).success,
  ).toBe(false);
  expect(
    kitComponentSchemas.Avatar.props.safeParse({
      src: source,
      accessibilityLabel: 'Person',
    }).success,
  ).toBe(false);
});
