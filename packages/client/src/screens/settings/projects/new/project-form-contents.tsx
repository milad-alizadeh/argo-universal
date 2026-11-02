import { Text } from '@repo/kit/primitives/content/text';
import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { EntryForm } from '@repo/kit/primitives/scaffolds/entry-form';
import type * as React from 'react';
import { sourceCopy, sources } from './project-new-copy';
import type { SourceFormProps } from './project-new-view';
import { ProjectSourceActions } from './project-source-actions';
import {
  ProjectSourceField,
  type SourceFieldProps,
} from './project-source-field';

export interface FormDrawing extends Omit<
  SourceFormProps,
  'onSubmit' | 'onChooseFolder'
> {
  disabled?: boolean;
  pickerError?: string;
  chooseFolder?: () => void;
  submit: () => void;
}

interface FieldApi {
  state: { value: string };
  handleChange: (value: string) => void;
}

interface FormContentsProps extends FormDrawing {
  field: FieldApi;
}

export function ProjectFormContents(
  props: FormContentsProps,
): React.JSX.Element {
  return (
    <EntryForm
      choice={<SourceChoice {...props} />}
      error={errorText(props)}
      actions={
        <ProjectSourceActions {...props} value={props.field.state.value} />
      }
    >
      <ProjectSourceField {...sourceField(props)} />
    </EntryForm>
  );
}

const sourceOptions = sources.map((value) => ({
  value,
  label: sourceCopy[value].label,
}));

function SourceChoice(
  props: Pick<SourceFormProps, 'source' | 'onChoose'> & { disabled?: boolean },
): React.JSX.Element {
  return (
    <SegmentedControl
      label="Add a Project from"
      value={props.source}
      disabled={props.disabled}
      options={sourceOptions}
      onValueChange={(next) =>
        props.onChoose(next === 'clone' ? 'clone' : 'folder')
      }
    />
  );
}

const errorText = (props: FormContentsProps): React.JSX.Element | null => {
  const error = props.pickerError ?? props.error;

  return error ? <Text accessibilityRole="alert">{error}</Text> : null;
};

const sourceField = (props: FormContentsProps): SourceFieldProps => ({
  source: props.source,
  value: props.field.state.value,
  disabled: props.disabled,
  onChange: props.field.handleChange,
  onSubmit: props.submit,
  onChooseFolder: props.chooseFolder,
});
