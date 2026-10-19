import assert from 'node:assert/strict';
import { test } from '@argo/plugin-kit/testing';

// The page names each file by the Server's reference, so the App never loads it from a Plugin's host.
test('the media page plays a clip and a sound', async ({ mount }) => {
  const page = await mount({
    page: '/media',
    surface: {
      platform: 'web',
      parts: {
        ScrollView: 1,
        Surface: 1,
        Stack: 1,
        Text: 3,
        Video: 1,
        Audio: 1,
      },
    },
  });

  const clip = await page.find('Hello clip');
  const chime = await page.find('Hello chime');

  assert.equal(clip.type, 'Video');
  assert.deepEqual(Object.keys(clip.props.source ?? {}).sort(), [
    'format',
    'hash',
    'pluginId',
  ]);
  assert.partialDeepStrictEqual(clip.props, {
    source: { format: 'mp4' },
    poster: { format: 'jpeg' },
  });
  assert.equal(chime.type, 'Audio');
  assert.partialDeepStrictEqual(chime.props, { source: { format: 'mp3' } });
});
