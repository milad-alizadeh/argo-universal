import { z } from 'zod';
import { part } from '../plugin-part-schema-utils';
import { wireParts } from '../wire-parts';

export const listsPartSchemas = {
  List: wireParts.List,
  'List.Section': wireParts['List.Section'],
  ListItem: wireParts.ListItem,
  Table: wireParts.Table,
  Metadata: part('Label and value rows for a detail view.', z.object({}), {
    slots: { rows: ['Label', 'Link', 'Pill', 'StatusDot'] },
  }),
};
