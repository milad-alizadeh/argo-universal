import { z } from 'zod';
import {
  part,
  optionalLabel,
  containerParts,
} from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const scaffoldsPartSchemas = {
  Page: wireParts.Page,
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
