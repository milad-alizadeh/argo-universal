import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
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

// Called as a section element so FieldGroup can discover its header, rows and footer.
export function projectSourceSection(
  props: SourceFieldProps,
): React.JSX.Element {
  return props.source === 'folder' && props.onChooseFolder
    ? folderSection(props)
    : typedSection(props);
}

function folderSection(props: SourceFieldProps): React.JSX.Element {
  return (
    <FieldGroup.Section footer="Choose an existing repository folder on this Mac.">
      {props.value ? (
        <FieldGroup.Value title="Folder" value={props.value} />
      ) : null}
      <Button
        label={props.value ? 'Change…' : 'Choose Folder…'}
        variant="text"
        disabled={props.disabled}
        onPress={props.onChooseFolder}
      />
    </FieldGroup.Section>
  );
}

function typedSection(props: SourceFieldProps): React.JSX.Element {
  const copy = sourceCopy[props.source];

  return (
    <FieldGroup.Section footer={copy.footer}>
      <FieldGroup.TextField
        title={copy.field}
        placeholder={copy.placeholder}
        value={props.value}
        disabled={props.disabled}
        onChangeText={props.onChange}
        onSubmit={props.onSubmit}
      />
    </FieldGroup.Section>
  );
}
