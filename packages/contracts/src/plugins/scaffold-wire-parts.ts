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
    .describe('The content drawn by the kit Markdown part.'),
  isLoading: z
    .boolean()
    .optional()
    .describe('Show the content loading state; the Metadata stays.'),
});

const listDetailReader =
  'Reads the list, then the selected item beside it on wide windows; on compact ones the list is the screen and opening a row moves to the item.';

export const scaffoldWireParts = {
  Page: pageWirePart,
  ListDetail: part(
    'A list beside its selected item on wide windows; on compact ones the list drills in to the item.',
    z.object({}),
    {
      group: 'scaffolds',
      root: true,
      // The detail is a whole page: its own title and Actions.
      slots: {
        list: ['List'],
        detail: ['Page', 'Detail'],
        empty: ['EmptyState'],
      },
      accessibility: {
        label:
          'Not labelled itself: the list and the detail name themselves, and the detail Page names the screen.',
        keyboard:
          'The scaffold is not focusable. Tab moves from the list to the detail on wide windows.',
        voiceOver: listDetailReader,
        talkBack: listDetailReader,
      },
    },
  ),
  Detail: part(
    'An item page: content beside its Metadata on wide screens, above it on narrow ones.',
    detailProps,
    {
      group: 'scaffolds',
      children: true,
      slots: { metadata: ['Metadata'], actions: ['ActionList'] },
    },
  ),
  Metadata: part(
    'Read-only label/value fields for a detail view.',
    metadataProps,
    { group: 'scaffolds', children: metadataChildParts },
  ),
  'Metadata.Label': part('A text Metadata field.', metadataLabelProps, {
    group: 'scaffolds',
  }),
  'Metadata.Link': part(
    'A link Metadata field, currently drawn as plain text.',
    metadataLinkProps,
    { group: 'scaffolds' },
  ),
  'Metadata.Pills': part(
    'A Metadata field containing Pills.',
    metadataPillsProps,
    { group: 'scaffolds', children: ['Pill'] },
  ),
  'Metadata.StatusDot': part(
    'A labelled status Metadata field.',
    metadataStatusDotProps,
    { group: 'scaffolds' },
  ),
  'Metadata.Avatar': part('A person Metadata field.', metadataAvatarProps, {
    group: 'scaffolds',
  }),
};
