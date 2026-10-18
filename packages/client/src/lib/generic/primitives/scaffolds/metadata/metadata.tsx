import { Children, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { List, ListSection } from '#primitives/lists/list';
import {
  MetadataLabel,
  MetadataLink,
  MetadataStatus,
  MetadataAvatar,
  MetadataPillsField,
} from './metadata-parts';
import type { MetadataProps } from './metadata-props';

const listOptions = { padding: 0, paddingTop: 0, paddingBottom: 0 } as const;

function MetadataRoot({ title, children }: MetadataProps): ReactNode {
  if (Children.toArray(children).length === 0) return null;

  return (
    <List
      {...listOptions}
      appearance={Platform.OS === 'web' ? 'plain' : 'grouped'}
    >
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
