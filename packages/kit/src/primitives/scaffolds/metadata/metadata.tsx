import { use, type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { List, ListSection } from '#primitives/lists/list';
import { flattenedChildren } from '../../../flattened-children';
import type { MetadataDrawing } from './metadata-drawing';
import {
  MetadataDrawingContext,
  MetadataWidthContext,
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
  properties: HeadedColumn,
  inline: InlineFields,
} satisfies Record<
  MetadataDrawing['root'],
  (props: MetadataProps) => ReactNode
>;

/*
 * Metadata draws the root its drawing names (metadata-drawing.ts) and gives that drawing to its fields. Inside a List,
 * such as a Settings page, it is one more section of it.
 */
function MetadataRoot(props: MetadataProps): ReactNode {
  const drawing = useResolvedMetadataDrawing(use(MetadataWidthContext));
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

// The heading starts on the fields' edge, not a List section's inset.
function HeadedColumn(props: MetadataProps): ReactNode {
  return (
    <View>
      <ColumnHeading title={props.title ?? 'Properties'} />
      <List {...listOptions} appearance="plain">
        <ListSection>{props.children}</ListSection>
      </List>
    </View>
  );
}

function ColumnHeading({ title }: { title: string }): ReactNode {
  return (
    <Text
      role="heading"
      accessibilityRole="heading"
      aria-level={2}
      className="pb-2"
    >
      {title}
    </Text>
  );
}

// Inline Metadata is one wrapping line of values; the line itself says what they are, so it needs no heading.
function InlineFields({ children }: MetadataProps): ReactNode {
  return (
    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
      {children}
    </View>
  );
}

export const Metadata = Object.assign(MetadataRoot, {
  Label: MetadataLabel,
  Link: MetadataLink,
  Pills: MetadataPillsField,
  StatusDot: MetadataStatus,
  Avatar: MetadataAvatar,
});
