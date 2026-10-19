import { z } from 'zod';
import {
  metadataProps,
  metadataLabelProps,
  metadataLinkProps,
  metadataPillsProps,
  metadataStatusDotProps,
  metadataAvatarProps,
  metadataChildParts,
} from './metadata-props';
import { pageWirePart } from './page-wire-part';
import { part } from './plugin-part-schema-utils';

export const detailProps = z.object({
  markdown: z
    .string()
    .optional()
    .describe(
      'The content as Markdown; drawn as body text until kit Markdown lands.',
    ),
  isLoading: z
    .boolean()
    .optional()
    .describe('Show the content loading state; the Metadata stays.'),
});

export const scaffoldWireParts = {
  Page: pageWirePart,
  Detail: part(
    'An item page: content beside its Metadata on wide screens, above it on narrow ones.',
    detailProps,
    {
      children: true,
      slots: { metadata: ['Metadata'], actions: ['ActionList'] },
    },
  ),
  Metadata: part(
    'Read-only label/value fields for a detail view.',
    metadataProps,
    { children: metadataChildParts },
  ),
  'Metadata.Label': part('A text Metadata field.', metadataLabelProps),
  'Metadata.Link': part(
    'A link Metadata field, currently drawn as plain text.',
    metadataLinkProps,
  ),
  'Metadata.Pills': part(
    'A Metadata field containing Pills.',
    metadataPillsProps,
    { children: ['Pill'] },
  ),
  'Metadata.StatusDot': part(
    'A labelled status Metadata field.',
    metadataStatusDotProps,
  ),
  'Metadata.Avatar': part('A person Metadata field.', metadataAvatarProps),
};
