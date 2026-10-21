import { wireParts } from '@repo/contracts/plugins/kit';
import type {
  MediaAsset,
  MediaUrl,
} from '@repo/kit/primitives/content/media-url';
import chime from '@repo/mocks/media/chime.mp3';
import poster from '@repo/mocks/media/poster.jpeg';
import { storyClip } from './story-clip.mocks';

const formats = (part: 'Video' | 'Audio'): ReadonlySet<MediaAsset['format']> =>
  new Set(wireParts[part].props.shape.source.shape.format.options);

const videoFormats = formats('Video');

const audioFormats = formats('Audio');

// Stories load the fixtures in @repo/mocks/media instead of a Server's asset route.
export const storyMediaUrl: MediaUrl = (asset) => {
  if (videoFormats.has(asset.format)) return storyClip;

  return audioFormats.has(asset.format) ? chime : poster;
};
