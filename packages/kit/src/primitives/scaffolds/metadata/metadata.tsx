import { useContext, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { List, ListSection } from '#primitives/lists/list';
import { flattenedChildren } from '../../../flattened-children';
import { ListContext } from '../../../list-context';
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
  if (flattenedChildren(children).length === 0) return null;

  return (
    <OwnList>
      <ListSection title={title}>{children}</ListSection>
    </OwnList>
  );
}

// Inside a List, such as a Settings page, Metadata is one more section of it.
function OwnList({ children }: { children: ReactNode }): ReactNode {
  if (useContext(ListContext).inList) return children;

  return (
    <List
      {...listOptions}
      appearance={Platform.OS === 'web' ? 'plain' : 'cards'}
    >
      {children}
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
