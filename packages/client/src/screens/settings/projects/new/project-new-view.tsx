import { useForm } from '@tanstack/react-form';
import type * as React from 'react';
import { useState } from 'react';
import type { ProjectSource } from '#features/settings';
import { ProjectFormContents } from './project-form-contents';
import type { FormDrawing } from './project-form-contents';
import { type FolderPicker, useProjectFolder } from './use-project-folder';

export interface ProjectNewViewProps {
  adding?: boolean;
  error?: string;
  onSubmit: (source: ProjectSource, value: string) => void;
  onCancel?: () => void;
  onChooseFolder?: () => Promise<string | null>;
}

// Project setup uses the same grouped form and content column as Settings.
export function ProjectNewView(props: ProjectNewViewProps): React.JSX.Element {
  const [source, setSource] = useState<ProjectSource>('folder');

  return (
    <SourceForm key={source} {...props} source={source} onChoose={setSource} />
  );
}

export type SourceFormProps = ProjectNewViewProps & {
  source: ProjectSource;
  onChoose: (source: ProjectSource) => void;
};

// Keyed by source: a repository URL can never become a folder path.
function SourceForm(props: SourceFormProps): React.JSX.Element {
  const form = useForm({ defaultValues: { value: '' }, onSubmit: send(props) });

  const picker = useProjectFolder(props.onChooseFolder, (path) =>
    form.setFieldValue('value', path),
  );

  const drawing = formDrawing(props, picker, () => void form.handleSubmit());

  return (
    <form.Field name="value">
      {(field) => <ProjectFormContents {...drawing} field={field} />}
    </form.Field>
  );
}

const send =
  (props: SourceFormProps) =>
  ({ value }: { value: { value: string } }): void => {
    const typed = submittedValue(props, value.value);

    if (!typed || props.adding) return;

    props.onSubmit(props.source, typed);
  };

function formDrawing(
  props: SourceFormProps,
  picker: FolderPicker,
  submit: () => void,
): FormDrawing {
  return {
    ...props,
    disabled: props.adding || picker.picking,
    pickerError: picker.error,
    chooseFolder: picker.choose,
    submit,
  };
}

// Native selection returns an exact path, which can legitimately end in a space.
const submittedValue = (props: SourceFormProps, value: string): string =>
  props.source === 'folder' && props.onChooseFolder ? value : value.trim();
