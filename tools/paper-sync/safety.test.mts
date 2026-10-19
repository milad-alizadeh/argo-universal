import { expect, it } from 'vitest';
import { selectedFiles } from './config.mts';
import { designKind } from './snapshot-reader.mts';
import { toolTexts } from './wire.mts';

it('treats legacy rectangle layers as frame leaves', () => {
  expect(designKind('Rectangle')).toBe('Frame');
  expect(designKind('Text')).toBe('Text');
});

it('rejects files outside the canonical configuration', () => {
  expect(() => selectedFiles('01M44G6AG3HPXGPPPMKS9S3H8J')).toThrow(
    'Not a canonical file',
  );
});

it('stops on ignored styles', () => {
  const ignored = {
    content: [{ type: 'text', text: '{"ignoredStyles":["bogus"]}' }],
  };

  expect(() => toolTexts(ignored, { name: 'update_styles', args: {} })).toThrow(
    'ignored styles',
  );
});

it('stops on a response for the wrong file', () => {
  const wrong = {
    content: [{ type: 'text', text: '{"file":{"id":"other"}}' }],
  };

  expect(() =>
    toolTexts(wrong, { name: 'get_node_info', args: { fileId: 'expected' } }),
  ).toThrow('Wrong Paper file');
});
