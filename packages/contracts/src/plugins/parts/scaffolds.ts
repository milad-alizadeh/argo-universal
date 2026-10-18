import { z } from 'zod';
import { metadataProps } from '../metadata-props';
import {
  part,
  handler,
  stringLabel,
  optionalLabel,
  containerParts,
} from '../plugin-part-schema-utils';

export const scaffoldsPartSchemas = {
  Metadata: part(
    'Read-only label/value fields for a detail view.',
    metadataProps,
  ),
  Page: part(
    'A page scaffold with a title, header actions, and optional search.',
    z.object({
      title: stringLabel,
      actions: z.array(z.string()).optional(),
      primaryAction: z
        .object({ label: stringLabel, onPress: handler('onPress') })
        .optional()
        .describe('The Page’s one primary action.'),
      search: z.boolean().optional(),
    }),
    { children: true },
  ),
  ListDetail: part(
    'A list and detail scaffold that splits on wide screens and drills in on compact screens.',
    z.object({}),
    { slots: { list: ['List'], detail: ['Detail'] } },
  ),
  Detail: part(
    'A content column with Markdown or composed content and Metadata.',
    z.object({ title: optionalLabel }),
    { slots: { content: containerParts, metadata: ['Metadata'] } },
  ),
  Inspector: part(
    'A side pane on wide screens and a Sheet on compact screens.',
    z.object({ title: optionalLabel }),
    { children: true },
  ),
};
