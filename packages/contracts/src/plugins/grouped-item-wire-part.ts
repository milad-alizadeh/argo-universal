import { z } from 'zod';
import { groupedItemProps, groupedItemV1 } from './kit-props';
import type { WirePartDefinition } from './wire-part-definition';
import { wirePartReferences } from './wire-part-reference';

const contentParts = [
  'Text',
  'Button',
  'Stack',
  'Row',
  'Column',
  'GroupedListItem',
  'Svg',
  'Pill',
] as const;

export const groupedItemWirePart = {
  props: groupedItemProps,
  versions: [groupedItemV1],
  container: true,
  children: false,
  slots: {
    leading: contentParts,
    accessories: contentParts,
    footer: contentParts,
    detail: contentParts,
  },
  events: { onPress: z.undefined() },
  reference: wirePartReferences.GroupedListItem,
} as const satisfies WirePartDefinition;
