import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { sourceCopy, sources } from './project-new-copy';
import type { SourceFormProps } from './project-new-view';
import { ProjectSourceActions } from './project-source-actions';
import {
  projectSourceSection,
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
    <Screen title="Add Project" onBack={props.onCancel}>
      <FieldGroup disabled={props.disabled}>
        {sourceChoiceSection(props)}
        {projectSourceSection(sourceField(props))}
        {errorSection(props)}
      </FieldGroup>
      <ProjectSourceActions {...props} value={props.field.state.value} />
    </Screen>
  );
}

const sourceChoiceSection = (props: FormContentsProps): React.JSX.Element => (
  <FieldGroup.Section>
    <SourceChoice {...props} />
  </FieldGroup.Section>
);

const sourceOptions = sources.map((value) => ({
  value,
  label: sourceCopy[value].label,
}));

const SourceChoice = (
  props: Pick<SourceFormProps, 'source' | 'onChoose'> & { disabled?: boolean },
): React.JSX.Element => (
  <FieldGroup.Picker
    title="Source"
    presentation="menu"
    value={props.source}
    disabled={props.disabled}
    options={sourceOptions}
    onValueChange={(next) =>
      props.onChoose(next === 'clone' ? 'clone' : 'folder')
    }
  />
);

const errorSection = (props: FormContentsProps): React.JSX.Element | null => {
  const error = props.pickerError ?? props.error;

  return error ? (
    <FieldGroup.Section>
      <Text accessibilityRole="alert">{error}</Text>
    </FieldGroup.Section>
  ) : null;
};

const sourceField = (props: FormContentsProps): SourceFieldProps => ({
  source: props.source,
  value: props.field.state.value,
  disabled: props.disabled,
  onChange: props.field.handleChange,
  onSubmit: props.submit,
  onChooseFolder: props.chooseFolder,
});
