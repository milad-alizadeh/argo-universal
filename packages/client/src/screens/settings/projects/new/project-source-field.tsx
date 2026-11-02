import {
  EntryFormField,
  EntryFormSelection,
} from '@repo/kit/primitives/scaffolds/entry-form';
import type * as React from 'react';
import type { ProjectSource } from '#features/settings';
import { sourceCopy } from './project-new-copy';

export interface SourceFieldProps {
  source: ProjectSource;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onChooseFolder?: () => void;
}

// Only a local desktop chooser selects a directory; other Devices enter a path on their Server.
export function ProjectSourceField(props: SourceFieldProps): React.JSX.Element {
  if (props.source === 'folder' && props.onChooseFolder)
    return <FolderChoice {...props} />;

  return <TypedSource {...props} />;
}

function FolderChoice(props: SourceFieldProps): React.JSX.Element {
  return <EntryFormSelection {...folderSelection(props)} />;
}

const folderSelection = (
  props: SourceFieldProps,
): React.ComponentProps<typeof EntryFormSelection> => ({
  title: 'Project Folder',
  name: props.value.split('/').findLast(Boolean) ?? props.value,
  value: props.value,
  description: props.value
    ? 'Add Project registers the selected repository.'
    : 'Choose an existing repository folder on this Mac.',
  chooseLabel: 'Choose Folder…',
  changeLabel: 'Change…',
  disabled: props.disabled,
  onChoose: props.onChooseFolder,
});

function TypedSource(props: SourceFieldProps): React.JSX.Element {
  const copy = sourceCopy[props.source];

  return (
    <EntryFormField
      title={copy.field}
      placeholder={copy.placeholder}
      description={copy.footer}
      value={props.value}
      disabled={props.disabled}
      onChangeText={props.onChange}
      onSubmit={props.onSubmit}
    />
  );
}
