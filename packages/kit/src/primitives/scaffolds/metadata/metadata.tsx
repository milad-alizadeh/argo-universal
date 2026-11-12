import type { ReactNode } from 'react';
import { List, ListSection } from '#primitives/lists/list';
import { flattenedChildren } from '../../../flattened-children';
import { AsideFields, PillFields } from './metadata-aside';
import type { MetadataDrawing } from './metadata-drawing';
import {
  MetadataDrawingContext,
  useResolvedMetadataDrawing,
} from './metadata-drawing-context';
import {
  MetadataLabel,
  MetadataLink,
  MetadataStatus,
  MetadataAvatar,
  MetadataPillsField,
} from './metadata-parts';
import type { MetadataProps } from './metadata-props';

const listOptions = { padding: 0, paddingTop: 0, paddingBottom: 0 } as const;

const roots = {
  'list-section': ListSectionRoot,
  'grouped-rows': GroupedRows,
  aside: AsideFields,
  pills: PillFields,
  icons: PillFields,
} satisfies Record<
  MetadataDrawing['root'],
  (props: MetadataProps) => ReactNode
>;

/*
 * Metadata draws the root its drawing names (metadata-drawing.ts) and gives that drawing to its fields. Inside a List,
 * such as a Settings page, it is one more section of it.
 */
function MetadataRoot(props: MetadataProps): ReactNode {
  const drawing = useResolvedMetadataDrawing();
  const Root = roots[drawing.root];

  if (flattenedChildren(props.children).length === 0) return null;

  return (
    <MetadataDrawingContext value={drawing}>
      <Root {...props} />
    </MetadataDrawingContext>
  );
}

function ListSectionRoot({ title, children }: MetadataProps): ReactNode {
  return <ListSection title={title}>{children}</ListSection>;
}

// A Detail's scroll view gives a List no height to fill: a phone draws the rows as one grouped section that takes its own.
function GroupedRows({ title, children }: MetadataProps): ReactNode {
  return (
    <List {...listOptions} appearance="grouped">
      <ListSection title={title}>{children}</ListSection>
    </List>
  );
}

export const Metadata = Object.assign(MetadataRoot, {
  Label: MetadataLabel,
  Link: MetadataLink,
  Pills: MetadataPillsField,
  StatusDot: MetadataStatus,
  Avatar: MetadataAvatar,
});
