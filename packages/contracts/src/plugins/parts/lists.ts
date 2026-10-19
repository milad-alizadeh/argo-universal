import { z } from 'zod';
import { listProps } from '../kit-props';
import { listExpansion } from '../list-expansion';
import { part } from '../plugin-part-schema-utils';
import { wirePartReferences } from '../wire-part-reference';
import { wireParts } from '../wire-parts';

export const listsPartSchemas = {
  List: wireParts.List,
  'List.Section': wireParts['List.Section'],
  ListItem: wireParts.ListItem,
  Table: {
    props: listProps,
    expansion: listExpansion,
    versions: [listProps],
    container: true,
    children: true,
    slots: {},
    events: {},
    reference: wirePartReferences.Table,
  },
  Metadata: part('Label and value rows for a detail view.', z.object({}), {
    slots: { rows: ['Label', 'Link', 'Pill', 'StatusDot'] },
  }),
};
