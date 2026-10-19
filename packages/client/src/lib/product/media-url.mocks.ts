import chime from '@repo/mocks/media/chime.mp3';
import poster from '@repo/mocks/media/poster.jpeg';
import type { MediaAsset, MediaUrl } from '#primitives/content/media-url';
import { storyClip } from './story-clip.mocks';

const videoFormats = new Set<MediaAsset['format']>(['mp4', 'webm', 'mov']);

const audioFormats = new Set<MediaAsset['format']>([
  'mp3',
  'm4a',
  'ogg',
  'wav',
  'aac',
  'flac',
]);

// Stories load the fixtures in @repo/mocks/media instead of a Server's asset route.
export const storyMediaUrl: MediaUrl = (asset) => {
  if (videoFormats.has(asset.format)) return storyClip;

  return audioFormats.has(asset.format) ? chime : poster;
};
