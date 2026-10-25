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
import { part } from './plugin-part-schema-utils';
import { screenWirePart } from './screen-wire-part';

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
  Screen: screenWirePart,
  ListDetail: part(
    'A list beside its selected item on wide windows; on compact ones the list drills in to the item.',
    z.object({}),
    {
      root: true,
      // The detail is a whole page: its own title and Actions.
      slots: {
        list: ['List'],
        detail: ['Screen', 'Detail'],
        empty: ['EmptyState'],
      },
      accessibility: {
        label:
          'Not labelled itself: the list and the detail name themselves, and the detail Screen names the screen.',
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
      children: true,
      slots: { metadata: ['Metadata'] },
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
