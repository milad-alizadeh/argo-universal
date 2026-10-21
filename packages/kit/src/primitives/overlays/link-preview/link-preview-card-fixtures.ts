import type { ComponentProps } from 'react';
import type { LinkPreviewCard } from './link-preview-card';
import {
  commitPreview,
  issuePreview,
  pullPreview,
  webPreview,
} from './link-preview.mocks';

type LinkPreviewCardProps = ComponentProps<typeof LinkPreviewCard>;

export const webLinkPreviewCard = {
  data: webPreview,
} satisfies LinkPreviewCardProps;

export const webWithImageLinkPreviewCard = {
  data: {
    ...webPreview,
    image: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="168"><rect width="320" height="168" fill="#e5e5e5"/></svg>')}`,
  },
} satisfies LinkPreviewCardProps;

export const issueLinkPreviewCard = {
  data: issuePreview,
} satisfies LinkPreviewCardProps;

export const pullRequestLinkPreviewCard = {
  data: pullPreview,
} satisfies LinkPreviewCardProps;

export const commitLinkPreviewCard = {
  data: commitPreview,
} satisfies LinkPreviewCardProps;
