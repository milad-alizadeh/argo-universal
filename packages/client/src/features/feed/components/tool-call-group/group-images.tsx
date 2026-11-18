import type * as React from 'react';
import type { FeedGroup } from '../../view/feed-view';
import { groupImages } from '../../view/tool-call-images';
import { imageStackAside } from '../feed-image-stack';

// The thumbnails that end a group's header, or none when its calls returned no images.
export const groupImageAside = (
  group: FeedGroup,
): React.JSX.Element | undefined =>
  imageStackAside(groupImages(group), 'stack');
