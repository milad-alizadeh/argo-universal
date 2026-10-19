import { z } from 'zod';
import { part, optionalLabel } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const scaffoldsPartSchemas = {
  Page: wireParts.Page,
  ListDetail: wireParts.ListDetail,
  Inspector: part(
    'A side pane on wide screens and a Sheet on compact screens.',
    z.object({ title: optionalLabel }),
    { children: true },
  ),
};
