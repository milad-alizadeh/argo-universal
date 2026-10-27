import { useContext, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { Surface } from '#primitives/layout/surface';
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

/*
 * Inside a List, such as a Settings page, Metadata is one more section of it. Alone it sits in a Detail's scroll view,
 * which gives a List no height to fill: the web draws a plain List, and a phone one card of the rows, which take their
 * own height.
 */
function OwnList({ children }: { children: ReactNode }): ReactNode {
  if (useContext(ListContext).inList) return children;

  if (Platform.OS !== 'web') return <Surface kind="card">{children}</Surface>;

  return (
    <List {...listOptions} appearance="plain">
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
