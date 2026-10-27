import { useContext, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { Surface } from '#primitives/layout/surface';
import { List, ListSection } from '#primitives/lists/list';
import { flattenedChildren } from '../../../flattened-children';
import { ListContext } from '../../../list-context';
import { useMetadataInline } from './metadata-inline';
import {
  MetadataLabel,
  MetadataLink,
  MetadataStatus,
  MetadataAvatar,
  MetadataPillsField,
} from './metadata-parts';
import type { MetadataProps } from './metadata-props';

const listOptions = { padding: 0, paddingTop: 0, paddingBottom: 0 } as const;

// Inside a List, such as a Settings page, Metadata is one more section of it; alone it sits beside a Detail's content.
function MetadataRoot({ title, children }: MetadataProps): ReactNode {
  const inList = useContext(ListContext).inList === true;

  if (flattenedChildren(children).length === 0) return null;

  if (inList) return <ListSection title={title}>{children}</ListSection>;

  return <OwnList title={title}>{children}</OwnList>;
}

/*
 * A Detail's scroll view gives a List no height to fill: a phone draws one card of the rows, which take their own
 * height. Desktop and web head the column Properties, unless the Plugin names it, or draw one line of values when the
 * Detail is too narrow for the column.
 */
function OwnList(props: MetadataProps): ReactNode {
  const inline = useMetadataInline();

  if (Platform.OS !== 'web')
    return (
      <Surface kind="card">
        <ListSection title={props.title}>{props.children}</ListSection>
      </Surface>
    );

  if (inline) return <InlineFields>{props.children}</InlineFields>;

  return <HeadedColumn {...props} />;
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
function InlineFields({ children }: { children: ReactNode }): ReactNode {
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
